import os
import shutil
import subprocess
import unittest

from _load import ROOT


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class MotoNav(unittest.TestCase):
    def test_node_unit_tests(self):
        folder = os.path.join(ROOT, "motonav", "test")
        files = [os.path.join(folder, f) for f in sorted(os.listdir(folder)) if f.endswith(".test.js")]
        run = subprocess.run(["node", "--test"] + files, capture_output=True, text=True, timeout=120)
        self.assertEqual(run.returncode, 0, run.stdout[-2000:] + run.stderr[-2000:])

    def test_app_script_has_valid_syntax(self):
        run = subprocess.run(["node", "--check", os.path.join(ROOT, "motonav", "app.js")],
                             capture_output=True, text=True, timeout=30)
        self.assertEqual(run.returncode, 0, run.stderr)


if __name__ == "__main__":
    unittest.main()
