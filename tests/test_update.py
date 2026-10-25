import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('updater',ROOT/'tools/update_template.py');updater=importlib.util.module_from_spec(spec);spec.loader.exec_module(updater)
class Updates(unittest.TestCase):
 def data(self,value=b'v1'):
  files={'runtime/app.js':value};return {'schemaVersion':1,'version':'1.0.0','files':{k:updater.digest(v) for k,v in files.items()}},files
 def test_content_is_preserved_and_upgrade_is_pinned(self):
  with tempfile.TemporaryDirectory() as folder:
   deck=Path(folder);(deck/'slides.json').write_text('my slides');(deck/'theme.css').write_text('my theme');m,f=self.data();updater.install(deck,m,f,'abc123');m,f=self.data(b'v2');m['version']='1.1.0';updater.install(deck,m,f,'def456')
   self.assertEqual((deck/'slides.json').read_text(),'my slides');self.assertEqual((deck/'theme.css').read_text(),'my theme');self.assertEqual(json.loads((deck/'presentation-kit.lock.json').read_text())['commit'],'def456')
 def test_local_kit_edit_refuses_update(self):
  with tempfile.TemporaryDirectory() as folder:
   deck=Path(folder);m,f=self.data();updater.install(deck,m,f,'abc123');(deck/'.presentation-kit/runtime/app.js').write_text('custom')
   with self.assertRaisesRegex(ValueError,'Local kit edit'):updater.install(deck,m,f,'other')
   self.assertEqual((deck/'.presentation-kit/runtime/app.js').read_text(),'custom')
 def test_unknown_files_are_not_deleted(self):
  with tempfile.TemporaryDirectory() as folder:
   deck=Path(folder);m,f=self.data();updater.install(deck,m,f,'abc');(deck/'.presentation-kit/important.txt').write_text('keep')
   with self.assertRaisesRegex(ValueError,'Unmanaged'):updater.install(deck,m,f,'def')
   self.assertEqual((deck/'.presentation-kit/important.txt').read_text(),'keep')
 def test_paths_and_tampered_content_are_rejected(self):
  for name in ('../secret','/etc/passwd','runtime/../../secret','other/a','runtime/../secret'):
   with self.assertRaises(ValueError):updater.checked_name(name)
  m,f=self.data()
  with self.assertRaisesRegex(ValueError,'checksum'):updater.verify(m,lambda _:b'tampered')
 def test_same_or_older_release_can_be_installed(self):
  with tempfile.TemporaryDirectory() as folder:
   deck=Path(folder);m,f=self.data();updater.install(deck,m,f,'release-one');m2,f2=self.data(b'v2');m2['version']='1.1.0';updater.install(deck,m2,f2,'release-two');updater.install(deck,m,f,'release-one');self.assertEqual((deck/'.presentation-kit/runtime/app.js').read_bytes(),b'v1')
if __name__=='__main__':unittest.main()
