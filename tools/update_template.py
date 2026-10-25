#!/usr/bin/env python3
"""Explicit, verified, content-preserving presentation-kit updates."""
import argparse
import hashlib
import io
import json
import os
import re
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile

REPOSITORY = 'tamimat/presentation-kit'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def checked_name(name):
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or '\\' in name or str(path) != name:
        raise ValueError(f'Unsafe kit path: {name}')
    if not name.startswith(('runtime/', 'lib/', 'tools/')):
        raise ValueError(f'Unexpected kit path: {name}')
    return name


def verify(manifest, read):
    if manifest.get('schemaVersion') != 1 or not manifest.get('version'):
        raise ValueError('Unsupported kit manifest')
    result = {}
    for name, expected in manifest['files'].items():
        checked_name(name)
        data = read(name)
        if digest(data) != expected:
            raise ValueError(f'Kit checksum mismatch: {name}')
        result[name] = data
    return result


def install(deck, manifest, files, commit):
    deck = deck.resolve(); target = deck / '.presentation-kit'; lock_path = deck / 'presentation-kit.lock.json'
    old = json.loads(lock_path.read_text()) if lock_path.exists() else None
    if target.exists():
        if not old:
            raise ValueError('Existing .presentation-kit has no lock; refusing to replace it')
        expected = old['files']
        for name, checksum in expected.items():
            path = target / checked_name(name)
            if not path.is_file() or digest(path.read_bytes()) != checksum:
                raise ValueError(f'Local kit edit detected: {name}. Commit/move it into theme.css before updating.')
        extras = {p.relative_to(target).as_posix() for p in target.rglob('*') if p.is_file()} - set(expected) - {'manifest.json'}
        extras = {p for p in extras if '__pycache__' not in p.split('/') and not p.endswith('.pyc')}
        if extras:
            raise ValueError(f'Unmanaged files inside kit: {sorted(extras)}')
    deck.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.kit-stage-', dir=deck))
    backup = deck / '.presentation-kit.previous'
    if backup.exists():
        shutil.rmtree(stage)
        raise ValueError('A previous kit backup exists; inspect it before updating')
    moved = False
    try:
        for name, data in files.items():
            path = stage / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)
        (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        lock = {'schemaVersion':1,'repository':REPOSITORY,'version':manifest['version'],'commit':commit,'files':manifest['files']}
        lock_temp = deck / '.presentation-kit.lock.tmp'
        lock_temp.write_text(json.dumps(lock, indent=2) + '\n')
        if target.exists():
            target.rename(backup); moved = True
        stage.rename(target)
        try:
            os.replace(lock_temp, lock_path)
        except BaseException:
            shutil.rmtree(target)
            if moved: backup.rename(target)
            raise
        if moved: shutil.rmtree(backup)
    finally:
        if stage.exists(): shutil.rmtree(stage)
    print(f"Installed presentation-kit v{manifest['version']} ({commit[:12]}). Content and theme were preserved.")
    print('Rebuild and preview your presentation, then review git diff before committing/publishing.')


def gh(*args):
    return subprocess.check_output(['gh', 'api', *args])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--deck', type=Path, default=Path.cwd())
    parser.add_argument('--version', help='Explicit release tag, e.g. v1.0.0')
    parser.add_argument('--latest', action='store_true', help='Explicitly choose the latest published release')
    parser.add_argument('--check', action='store_true', help='Report versions without changing files')
    parser.add_argument('--source', type=Path, help='Local kit checkout for development')
    args = parser.parse_args()
    if args.version and not re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?', args.version):
        parser.error('Use a release tag such as v1.0.0')
    if args.source:
        manifest = json.loads((args.source / 'manifest.json').read_text())
        if args.version and args.version.lstrip('v') != manifest['version']:
            parser.error('Requested version differs from local source')
        files = verify(manifest, lambda name:(args.source / name).read_bytes())
        commit = subprocess.check_output(['git','-C',str(args.source),'rev-parse','HEAD'], text=True).strip() if (args.source / '.git').exists() else 'local-development'
    else:
        if not (args.version or args.latest or args.check):
            parser.error('Choose --version vX.Y.Z or --latest; updates are never automatic')
        release = json.loads(gh(f'repos/{REPOSITORY}/releases/latest')) if args.latest or args.check else None
        if args.check:
            lock = args.deck / 'presentation-kit.lock.json'
            current = json.loads(lock.read_text())['version'] if lock.exists() else 'not installed'
            print(f"Installed: {current}; available: {release['tag_name']}. No files changed.")
            return
        tag = release['tag_name'] if args.latest else args.version
        # Resolve the chosen tag once; fetch the immutable commit, not moving main.
        commit = json.loads(gh(f'repos/{REPOSITORY}/commits/{tag}'))['sha']
        raw = gh(f'repos/{REPOSITORY}/tarball/{commit}')
        with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
            members = archive.getmembers()
            if not members: raise ValueError('Empty kit archive')
            prefix = members[0].name.split('/')[0] + '/'
            def read(name):
                member = archive.getmember(prefix + name)
                if not member.isfile() or member.size > 10_000_000: raise ValueError('Unexpected archive entry')
                return archive.extractfile(member).read()
            manifest = json.loads(read('manifest.json'))
            if tag != 'v' + manifest['version']: raise ValueError('Release and manifest versions differ')
            files = verify(manifest, read)
    if args.check:
        print(f"Available locally: {manifest['version']}. No files changed."); return
    install(args.deck, manifest, files, commit)

if __name__ == '__main__':
    main()
