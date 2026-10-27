#!/usr/bin/env python3
"""Tests locaux sans accès réseau ni clé YouTube."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("update-phasmo-shorts.py")
SPEC = importlib.util.spec_from_file_location("phasmo_shorts_sync", SCRIPT)
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


def video(identifier, title="Astuce vérifiée", owner=None, state="public"):
    snippet = {
        "resourceId": {"kind": "youtube#video", "videoId": identifier},
        "title": title,
        "thumbnails": {"high": {
            "url": "https://i.ytimg.com/vi/" + identifier + "/hqdefault.jpg"}},
    }
    if owner:
        snippet["videoOwnerChannelId"] = owner
    return {"snippet": snippet, "status": {"privacyStatus": state}}


class PhasmoSyncTests(unittest.TestCase):
    def test_pagination_dedoublonnage_et_ordre(self):
        pages = [
            {"items": [video("ABCdef12345")], "nextPageToken": "deux"},
            {"items": [video("ABCdef12345"), video("FGHabc12345")]},
        ]
        with patch.object(sync, "fetch_page", side_effect=pages):
            data = sync.collect("fausse-cle-test")
        self.assertEqual([v["id"] for v in data["videos"]],
                         ["ABCdef12345", "FGHabc12345"])
        self.assertEqual(data["videos"][0]["url"],
                         "https://www.youtube.com/shorts/ABCdef12345")

    def test_ignore_prive_et_autre_chaine(self):
        page = {"items": [
            video("ABCdef12345", state="private"),
            video("FGHabc12345", owner="UCautre"),
            video("JKLabc12345", owner=sync.CHANNEL_ID),
        ]}
        with patch.object(sync, "fetch_page", return_value=page):
            self.assertEqual(len(sync.collect("test")["videos"]), 1)

    def test_playlist_vide_conserve_ancien_fichier(self):
        with patch.object(sync, "fetch_page", return_value={"items": []}):
            with self.assertRaises(ValueError):
                sync.collect("test")
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp) / "phasmo-shorts.json"
            original = {"schemaVersion": 1, "videos": [{"id": "ancienne"}]}
            sync.save_atomic(target, original)
            first = target.read_bytes()
            self.assertEqual(target.read_bytes(), first)


if __name__ == "__main__":
    unittest.main()
