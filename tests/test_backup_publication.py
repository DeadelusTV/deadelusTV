"""Tests sans acces reseau, secrets ni base de production."""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / 'scripts/backup_publication.py'
spec = importlib.util.spec_from_file_location('publication', MODULE)
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
COMMIT = 'a' * 40


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.release = self.base / 'releases' / '123-1'
        self.release.mkdir(parents=True)
        (self.release / 'index.html').write_text('<html>version actuelle</html>')
        (self.release / 'data').mkdir()
        (self.release / 'data/fixture.json').write_text('{"public": true}')
        (self.base / 'current').symlink_to(self.release, target_is_directory=True)

    def tearDown(self):
        self.temp.cleanup()

    def archive(self, phase='avant', operation='456-1'):
        data = io.BytesIO()
        b.capture(self.base, phase, operation, COMMIT, data)
        target = self.base / 'capture.tar.gz'
        target.write_bytes(data.getvalue())
        return target

    def test_before_captures_active_not_new_version(self):
        result = b.verify_archive(self.archive())
        self.assertEqual(result['active_release'], '123-1')
        self.assertEqual(result['operation'], '456-1')
        self.assertIsNone(result['active_marker'])
        self.assertEqual(result['files']['index.html']['sha256'], b.file_hash(self.release / 'index.html'))
        self.assertEqual((self.base / 'current').resolve(), self.release)

    def test_archive_can_rebuild_all_public_files(self):
        archive = self.archive()
        manifest = b.verify_archive(archive)
        restored = self.base / 'restored'
        with tarfile.open(archive, 'r:gz') as tar:
            for name in manifest['files']:
                path = restored / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(tar.extractfile('site/' + name).read())
        self.assertEqual(b.inventory(restored), b.inventory(self.release))

    def test_after_requires_new_release(self):
        with self.assertRaises(ValueError):
            self.archive('apres', '456-1')

    def test_after_requires_matching_marker(self):
        with self.assertRaises(ValueError):
            self.archive('apres', '123-1')
        (self.release / 'data/deployment-version.json').write_text(json.dumps({'commit': COMMIT, 'operation': 'wrong'}))
        with self.assertRaises(ValueError):
            self.archive('apres', '123-1')

    def test_after_is_validated(self):
        (self.release / 'data/deployment-version.json').write_text(json.dumps({'commit': COMMIT, 'operation': '123-1'}))
        self.assertEqual(b.verify_archive(self.archive('apres', '123-1'))['active_marker']['commit'], COMMIT)

    def test_no_current_fails(self):
        (self.base / 'current').unlink()
        with self.assertRaises(ValueError):
            self.archive()

    def test_current_cannot_escape_base(self):
        (self.base / 'current').unlink()
        (self.base / 'current').symlink_to(self.base)
        with self.assertRaises(ValueError):
            self.archive()

    def test_missing_index_fails(self):
        (self.release / 'index.html').unlink()
        with self.assertRaises(ValueError):
            self.archive()

    def test_symlink_is_refused(self):
        (self.release / 'link').symlink_to('/etc/passwd')
        with self.assertRaises(ValueError):
            self.archive()

    def test_secret_paths_are_refused(self):
        for name in ['.env', 'db.sql', 'private.key']:
            path = self.release / name
            path.write_text('fixture')
            with self.assertRaises(ValueError):
                self.archive()
            path.unlink()

    def test_path_injection_is_refused(self):
        for name in ['../file', '/file', 'one/../two', 'one\\two', './file', 'name\ncontrol']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                b.safe_public_path(name)
        for name in [';rm', 'bad/path', 'bad id', '../../current']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                b.safe_id(name)

    def test_site_change_during_capture_is_refused(self):
        first = b.inventory(self.release)
        changed = {**first, 'new.txt': {'size': 1, 'sha256': 'x'}}
        with patch.object(b, 'inventory', side_effect=[first, changed]), self.assertRaises(ValueError):
            self.archive()

    def test_corrupt_archive_is_refused(self):
        archive = self.archive()
        data = bytearray(archive.read_bytes())
        data[len(data) // 2] ^= 255
        archive.write_bytes(data)
        with self.assertRaises((ValueError, tarfile.TarError, OSError, EOFError)):
            b.verify_archive(archive)

    def test_tar_traversal_and_links_are_refused(self):
        for name, member_type in [('../outside', tarfile.REGTYPE), ('site/link', tarfile.SYMTYPE)]:
            target = self.base / 'bad.tar.gz'
            with tarfile.open(target, 'w:gz') as tar:
                item = tarfile.TarInfo(name)
                item.type = member_type
                tar.addfile(item, io.BytesIO(b''))
            with self.assertRaises(ValueError):
                b.verify_archive(target)

    def test_private_repository_is_mandatory(self):
        with patch.dict(b.os.environ, {'GH_TOKEN': 'test'}), patch.object(b, 'gh_json', return_value={'private': False}):
            with self.assertRaises(ValueError):
                b.private_repository()

    def test_no_secret_stops_before_network(self):
        with patch.dict(b.os.environ, {}, clear=True), patch.object(b, 'gh_json') as network:
            with self.assertRaises(ValueError):
                b.private_repository()
            network.assert_not_called()

    def test_ssh_failure_creates_no_release_or_receipt(self):
        receipt = self.base / 'receipt.json'
        with patch.object(b, 'private_repository'), patch.object(b, 'run', side_effect=subprocess.CalledProcessError(1, 'ssh')) as action:
            with self.assertRaises(subprocess.CalledProcessError):
                b.publication_backup('avant', '456-1', COMMIT, self.base / 'config', receipt)
            self.assertEqual(action.call_args.args[0], 'ssh')
            self.assertEqual(action.call_count, 1)
        self.assertFalse(receipt.exists())

    def test_git_bundle_restores_exact_refs(self):
        source = self.base / 'git-source'
        source.mkdir()
        def git(*args):
            return subprocess.check_output(['git', '-C', str(source), *args], stderr=subprocess.DEVNULL)
        git('init', '-b', 'main')
        git('config', 'user.email', 'test@example.invalid')
        git('config', 'user.name', 'Test')
        (source / 'fixture.txt').write_text('source publique')
        git('add', '.')
        git('commit', '-m', 'fixture')
        git('branch', 'secondaire')
        git('tag', 'restauration-test')
        commit = git('rev-parse', 'HEAD').decode().strip()
        bundle = self.base / 'source.bundle'
        git('bundle', 'create', str(bundle), '--all')
        b.verify_bundle(bundle, source / '.git', self.base / 'git-restored', commit)


if __name__ == '__main__':
    unittest.main()
