from pathlib import Path
import argparse, importlib.util, sys
ROOT=Path(__file__).resolve().parent
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/'.presentation-kit/lib'))
from render import render
from exports import offline_html, export_html
parser=argparse.ArgumentParser()
parser.add_argument('--config',type=Path,default=ROOT/'presentation.json')
parser.add_argument('--offline',type=Path)
parser.add_argument('--site',type=Path)
args=parser.parse_args()
output,html=render(ROOT,args.config.resolve())
print(output)
if args.offline:
 args.offline.parent.mkdir(parents=True,exist_ok=True);args.offline.write_text(offline_html(html,output.parent,ROOT));print(args.offline)
if args.site:
 if args.site.exists():raise SystemExit('Choose a new output directory')
 export_html(html,output.parent,args.site,ROOT,args.site);print(args.site)
