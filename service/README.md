# Optional live relay

Reference Vinext/D1 API implementation. Deploy it in your own environment; no
personal service endpoint is included in the template. Place `route.ts` at
`app/api/sessions/route.ts` and `schema.ts` at `db/schema.ts`, bind D1 as `DB`,
and declare `ALLOWED_ORIGINS` as a comma-separated list of presentation origins.
Generate and review your schema migration before deploying.

POST creates a room with a deck ID, slide count and starting slide. GET returns
public position/status. PUT requires the private presenter token and a newer
sequence. Rooms expire after eight hours. Keep the presenter token out of viewer
links. Only token hashes are stored. Each deck can have up to 500 slides.

Set `live.endpoint` in the consuming deck's `presentation.json` to your deployed
`/api/sessions` URL. Its `shareUrl` supplies the public presentation URL. Hosts and
viewers keep independent language choices. Deployed service changes are separate
from per-deck kit updates; preserve old clients when evolving the protocol.
