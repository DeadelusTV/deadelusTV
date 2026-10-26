"""Tests sans réseau pour le service de statut Twitch."""
import io
import unittest
from twitch_status_service import TwitchStatusClient


class FakeResponse(io.BytesIO):
    def __enter__(self): return self
    def __exit__(self, *_): self.close()


class StatusTests(unittest.TestCase):
    def test_cache_et_statut(self):
        calls = []
        clock = [1000]

        def opener(req, timeout):
            calls.append((req.full_url, req.data, timeout))
            if "oauth2/token" in req.full_url:
                self.assertIn(b"client_secret=secret", req.data)
                return FakeResponse(b'{"access_token":"test-token","expires_in":3600}')
            self.assertEqual(req.get_header("Authorization"), "Bearer test-token")
            return FakeResponse(b'{"data":[{"type":"live"}]}')

        client = TwitchStatusClient("client", "secret", opener=opener, clock=lambda:clock[0])
        self.assertTrue(client.get_live())
        self.assertTrue(client.get_live())
        self.assertEqual(len(calls), 2)
        clock[0] += 46
        self.assertTrue(client.get_live())
        self.assertEqual(len(calls), 3)

    def test_hors_ligne(self):
        def opener(req, timeout):
            if "oauth2/token" in req.full_url:
                return FakeResponse(b'{"access_token":"t","expires_in":3600}')
            return FakeResponse(b'{"data":[]}')
        self.assertFalse(TwitchStatusClient("c","s",opener=opener).get_live())


if __name__ == "__main__":
    unittest.main()
