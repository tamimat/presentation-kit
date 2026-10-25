from pathlib import Path
import argparse, shutil, subprocess, sys
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('destination',type=Path);args=p.parse_args()
if args.destination.exists() and any(args.destination.iterdir()):p.error('Destination must be empty')
args.destination.mkdir(parents=True,exist_ok=True)
for path in (root/'starter').iterdir():
 if path.is_file():shutil.copy2(path,args.destination/path.name)
subprocess.run([sys.executable,str(root/'tools/update_template.py'),'--deck',str(args.destination),'--source',str(root)],check=True)
print('Edit presentation.json, slides.json and theme.css, then run python3 build.py.')
