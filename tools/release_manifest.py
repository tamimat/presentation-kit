from pathlib import Path
import hashlib, json
root=Path(__file__).resolve().parents[1]
files={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for folder in ('runtime','lib','tools') for p in sorted((root/folder).rglob('*')) if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc'}
(root/'manifest.json').write_text(json.dumps({'schemaVersion':1,'version':(root/'VERSION').read_text().strip(),'files':files},indent=2)+'\n')
print(f'Verified file manifest: {len(files)} files')
