"""Vérifie le retrait de Google Fonts et l'intégrité des polices locales."""
import unittest
from pathlib import Path

PUBLIC = Path(__file__).resolve().parents[1] / "public"

class LocalFontsTests(unittest.TestCase):
    def test_no_google_font_requests(self):
        html = (PUBLIC / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="assets/local-fonts.css"', html)
        for host in ("fonts.googleapis.com", "fonts.gstatic.com"):
            self.assertNotIn(host, html)
        self.assertNotIn("Academy.ttf", html)

    def test_woff2_assets_and_open_licenses(self):
        css = (PUBLIC / "assets/local-fonts.css").read_text(encoding="utf-8")
        for filename, family in (
            ("bungee-inline-latin-400-normal.woff2", "Bungee Inline"),
            ("great-vibes-latin-400-normal.woff2", "Great Vibes"),
        ):
            self.assertIn("font-family: '"+family+"'", css)
            self.assertIn(filename, css)
            path = PUBLIC / "assets/fonts" / filename
            self.assertTrue(path.is_file(), filename)
            self.assertEqual(path.read_bytes()[:4], b"wOF2", filename)
        for filename in ("OFL-Bungee-Inline.txt", "OFL-Great-Vibes.txt"):
            license_file = PUBLIC / "assets/fonts" / filename
            self.assertIn("SIL OPEN FONT LICENSE", license_file.read_text(encoding="utf-8"))

if __name__ == "__main__":
    unittest.main()
