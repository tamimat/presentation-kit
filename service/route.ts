import { env } from "cloudflare:workers";

const allowedOrigins = () => new Set(((env as Cloudflare.Env & { ALLOWED_ORIGINS?: string }).ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean));
const duration = 8 * 60 * 60 * 1000;
type Row = { id: string; deck: string; slide_count: number; slide: number; sequence: number; updated_at: number; expires_at: number; ended: number };

function response(request: Request, data: unknown, status = 200) {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
  };
  if (origin && (allowedOrigins().has(origin) || origin === new URL(request.url).origin)) headers["Access-Control-Allow-Origin"] = origin;
  return status === 204 ? new Response(null, { status, headers }) : Response.json(data, { status, headers });
}
function allowed(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || allowedOrigins().has(origin) || origin === new URL(request.url).origin;
}
function publicState(row: Row) {
  return { id: row.id, deck: row.deck, slideCount: row.slide_count, slide: row.slide, sequence: row.sequence,
    updatedAt: row.updated_at, expiresAt: row.expires_at, ended: !!row.ended,
    active: !row.ended && Date.now() - row.updated_at < 45_000 };
}
async function hash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), n => n.toString(16).padStart(2, "0")).join("");
}
function random(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), n => n.toString(16).padStart(2, "0")).join("");
}
async function payload(request: Request) {
  const text = await request.text();
  if (text.length > 512) throw new Error("body");
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("body");
  return value;
}
function slideValid(slide: unknown, count: number) { return Number.isInteger(slide) && Number(slide) >= 0 && Number(slide) < count; }

export function OPTIONS(request: Request) { return response(request, null, allowed(request) ? 204 : 403); }
export async function GET(request: Request) { return handle(request, "GET"); }
export async function POST(request: Request) { return handle(request, "POST"); }
export async function PUT(request: Request) { return handle(request, "PUT"); }

async function handle(request: Request, method: string): Promise<Response> {
  if (!allowed(request)) return response(request, { error: "Origin not allowed" }, 403);
  const db = env.DB;
  if (!db) return response(request, { error: "Service unavailable" }, 503);
  try {
    const now = Date.now();
    if (method === "POST") {
      const data = await payload(request);
      const count = data.slideCount;
      if (typeof data.deck !== "string" || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(data.deck) || !Number.isInteger(count) || count < 1 || count > 500 || !slideValid(data.slide, count)) return response(request, { error: "Invalid deck or slide count" }, 400);
      // Rotate the hash daily and never retain raw IP addresses.
      const bucket = Math.floor(now / 60_000);
      const key = await hash(`${new Date(now).toISOString().slice(0, 10)}:${request.headers.get("cf-connecting-ip") || "local"}:${bucket}`);
      const results = await db.batch([
        db.prepare("DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at < ? LIMIT 100)").bind(now),
        db.prepare("DELETE FROM creation_limits WHERE key IN (SELECT key FROM creation_limits WHERE expires_at < ? LIMIT 100)").bind(now),
        db.prepare("INSERT INTO creation_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count").bind(key, now + 120_000),
      ]);
      if (Number((results[2].results[0] as { count: number } | undefined)?.count) > 5) return response(request, { error: "Please wait a minute before starting another session" }, 429);
      const id = random(16), token = random(32), expiresAt = now + duration;
      await db.prepare("INSERT INTO sessions (id, deck, slide_count, host_hash, slide, sequence, updated_at, expires_at, ended) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0)").bind(id, data.deck, count, await hash(token), data.slide, now, expiresAt).run();
      return response(request, { id, token, expiresAt, sequence: 0 }, 201);
    }
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[a-f0-9]{32}$/.test(id)) return response(request, { error: "Session not found" }, 404);
    const row = await db.prepare("SELECT id, deck, slide_count, slide, sequence, updated_at, expires_at, ended FROM sessions WHERE id = ? AND expires_at > ?").bind(id, now).first<Row>();
    if (!row) return response(request, { error: "Session expired or not found" }, 404);
    if (method === "GET") return response(request, publicState(row));
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    if (!/^[a-f0-9]{64}$/.test(token)) return response(request, { error: "Presenter authorization required" }, 401);
    const hostHash = await hash(token);
    const owner = await db.prepare("SELECT id FROM sessions WHERE id = ? AND host_hash = ?").bind(id, hostHash).first();
    if (!owner) return response(request, { error: "Presenter authorization required" }, 401);
    if (row.ended) return response(request, { error: "Session ended" }, 410);
    const data = await payload(request);
    if (!slideValid(data.slide, row.slide_count) || !Number.isSafeInteger(data.sequence) || data.sequence < 1 || typeof data.ended !== "boolean") return response(request, { error: "Invalid update" }, 400);
    await db.prepare("UPDATE sessions SET slide = ?, sequence = ?, updated_at = ?, ended = ? WHERE id = ? AND host_hash = ? AND sequence < ? AND ended = 0 AND expires_at > ?")
      .bind(data.slide, data.sequence, now, data.ended ? 1 : 0, id, hostHash, data.sequence, now).run();
    return response(request, { ok: true });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message === "body")) return response(request, { error: "Invalid request" }, 400);
    console.error("Session request failed", error instanceof Error ? error.message : "Unknown error");
    return response(request, { error: "Service unavailable; please retry" }, 503);
  }
}
