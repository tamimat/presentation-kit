"""Update explicitly: python3 update-template.py --version v1.0.0 (or --check)."""
from pathlib import Path
import runpy, sys
root=Path(__file__).resolve().parent
sys.dont_write_bytecode=True
sys.argv=[sys.argv[0],'--deck',str(root),*sys.argv[1:]]
runpy.run_path(str(root/'.presentation-kit/tools/update_template.py'),run_name='__main__')
