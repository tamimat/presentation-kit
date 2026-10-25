"""Self-contained offline HTML and an allowlisted static publication export."""
from pathlib import Path
import base64
from html.parser import HTMLParser
import re
from urllib.parse import unquote, urlsplit


def local_path(base, ref, root):
    value = urlsplit(ref)
    if value.scheme or value.netloc or not value.path:
        return None
    path = (base / unquote(value.path)).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError(f'Asset outside project: {ref}')
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def offline_html(html, document_dir, project_root=None):
    root = (project_root or document_dir).resolve()
    html = re.sub(r'<link rel="manifest"[^>]+>', '', html)
    html = re.sub(r'<link rel="license" href="([^"]+)">', lambda m: '<!-- '+local_path(document_dir,m[1],root).read_text()+' -->', html)
    def stylesheet(match):
        path = local_path(document_dir, match[1], root)
        value = path.read_text()
        def font(m):
            file = local_path(path.parent, m[1].strip('\"\''), root)
            mime = 'font/woff2' if file.suffix == '.woff2' else 'font/ttf'
            return 'url(data:' + mime + ';base64,' + base64.b64encode(file.read_bytes()).decode() + ')'
        return '<style>' + re.sub(r'url\(([^)]+\.(?:ttf|woff2)(?:\?[^)]*)?)\)', font, value) + '</style>'
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', stylesheet, html)
    html = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script>' + local_path(document_dir, m[1], root).read_text() + '</script>', html)
    def picture(match):
        path = local_path(document_dir, match[1], root)
        mime = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'}[path.suffix]
        return 'src="data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode() + '"'
    html = re.sub(r'src="([^"\s]+\.(?:png|jpe?g|svg|webp)(?:\?[^"\s]*)?)"', picture, html)
    html = html.replace('loading="lazy"', 'loading="eager"')
    # A portable single-deck file cannot include other local HTML/PDF pages.
    html = re.sub(r'<a\b[^>]*href="(?!#|data:|https?://)[^"]+"[^>]*>.*?</a>', '', html, flags=re.S)
    if re.search(r'(?:src|href)="(?:\.\./|\.presentation-kit/|assets/)', html):
        raise ValueError('Unembedded local asset in offline document')
    return html


class Resources(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in ('script','img') and values.get('src'):
            self.refs.append(values['src'])
        if tag == 'link' and values.get('rel') in ('stylesheet','manifest','icon','apple-touch-icon','license'):
            self.refs.append(values['href'])


def export_html(html, document_dir, output_dir, project_root=None, site_root=None):
    """Copy references, never source files discovered by walking the project."""
    root = (project_root or document_dir).resolve()
    target_root = (site_root or output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / 'index.html').write_text(html.replace('.presentation-kit/runtime/', 'presentation-kit/runtime/'))
    parser = Resources(); parser.feed(html)
    pending = [(document_dir, output_dir, ref) for ref in parser.refs]
    copied = set()
    while pending:
        source_base, target_base, ref = pending.pop()
        source = local_path(source_base, ref, root)
        if source is None:
            continue
        public_ref = unquote(urlsplit(ref).path).replace('.presentation-kit/runtime/', 'presentation-kit/runtime/')
        target = (target_base / public_ref).resolve()
        if not target.is_relative_to(target_root):
            raise ValueError(f'Publication target escapes output: {ref}')
        if target in copied:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes()); copied.add(target)
        if source.suffix == '.css':
            pending.extend((source.parent, target.parent, value.strip('\"\'')) for value in re.findall(r'url\(([^)]+)\)', source.read_text()) if not value.startswith('data:'))
    return copied
