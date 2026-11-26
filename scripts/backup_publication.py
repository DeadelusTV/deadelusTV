#!/usr/bin/env python3
"""Archive le site public OVH sans l'alterer ; publie uniquement dans le depot prive."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tarfile
import tempfile

SOURCE = "DeadelusTV/deadelusTV"
DESTINATION = "DeadelusTV/DeadelusTV-backups"
BASE = Path("/var/www/deadelustv/accueil")
LIMIT = 1_900_000_000
MAX_FILES = 100_000


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def safe_id(value: str) -> str:
    require(bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}", value)), "Identifiant de version invalide")
    return value


def sha256(stream) -> str:
    h = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
        h.update(chunk)
    return h.hexdigest()


def file_hash(path: Path) -> str:
    with path.open("rb") as stream:
        return sha256(stream)


def safe_public_path(name: str) -> None:
    p = PurePosixPath(name)
    require(bool(name) and not p.is_absolute() and ".." not in p.parts and "\\" not in name,
            "Chemin public non sur")
    require(all(ord(c) >= 32 and ord(c) != 127 for c in name), "Caractere de controle dans un chemin")
    require(str(p) == name, "Chemin public non canonique")
    forbidden = {".git", "node_modules", "supabase"}
    require(not any(x in forbidden or x == ".env" or x.startswith(".env.") for x in p.parts),
            "Fichier prive inattendu dans le site public")
    require(not re.search(r"\.(?:sql(?:\.gz)?|sqlite\d*|db|pem|key|p12|pfx)$", name, re.I),
            "Fichier sensible inattendu dans le site public")


def inventory(root: Path) -> dict:
    result = {}
    size = 0
    for folder, dirs, files in os.walk(root, followlinks=False):
        for name in dirs + files:
            path = Path(folder) / name
            require(not path.is_symlink(), "Lien symbolique dans le site public")
        for name in sorted(files):
            path = Path(folder) / name
            before = path.stat()
            require(stat.S_ISREG(before.st_mode), "Fichier public non ordinaire")
            relative = path.relative_to(root).as_posix()
            safe_public_path(relative)
            size += before.st_size
            require(size < LIMIT and len(result) < MAX_FILES, "Site trop volumineux pour cette archive")
            digest = file_hash(path)
            after = path.stat()
            require((before.st_ino, before.st_size, before.st_mtime_ns) ==
                    (after.st_ino, after.st_size, after.st_mtime_ns), "Fichier modifie pendant la lecture")
            result[relative] = {"size": before.st_size, "sha256": digest}
    require(result.get("index.html", {}).get("size", 0) > 0, "index.html absent ou vide")
    return dict(sorted(result.items()))


def current_release(base: Path) -> Path:
    require((base / "current").is_symlink(), "current doit etre un lien symbolique existant")
    root = (base / "current").resolve(strict=True)
    require(root.parent == (base / "releases").resolve(strict=True) and root.is_dir(),
            "Version active hors du repertoire releases")
    safe_id(root.name)
    return root


def capture(base: Path, phase: str, operation: str, commit: str, output) -> None:
    """Lecture uniquement : tar en flux ; tout changement detecte invalide la capture."""
    require(phase in {"avant", "apres", "controle"}, "Phase inconnue")
    safe_id(operation)
    require(bool(re.fullmatch(r"[0-9a-f]{40}", commit)), "Commit invalide")
    root = current_release(base)
    files = inventory(root)
    marker = None
    marker_path = root / "data/deployment-version.json"
    if marker_path.exists():
        require(marker_path.stat().st_size < 4096, "Marqueur de publication trop volumineux")
        marker = json.loads(marker_path.read_text("utf-8"))
    if phase == "apres":
        require(root.name == operation, "La nouvelle version n'est pas celle actuellement servie")
        require(isinstance(marker, dict) and marker.get("commit") == commit
                and marker.get("operation") == operation, "Marqueur de publication incoherent")
    metadata = {"schema": 1, "scope": "fichiers-publics-OVH-accueil", "phase": phase,
                "operation": operation, "deployment_commit": commit,
                "active_release": root.name, "active_marker": marker,
                "captured_at": dt.datetime.now(dt.timezone.utc).isoformat(), "files": files}
    with tarfile.open(fileobj=output, mode="w|gz") as tar:
        for name in files:
            path = root / name
            with path.open("rb") as stream:
                info = tar.gettarinfo(str(path), "site/" + name)
                require(info.isfile(), "Type de fichier archive non autorise")
                tar.addfile(info, stream)
        require(files == inventory(root) and current_release(base) == root,
                "Le site a change pendant la capture : aucun export ne sera valide")
        data = json.dumps(metadata, ensure_ascii=False, sort_keys=True).encode("utf-8")
        info = tarfile.TarInfo("manifest.json")
        info.size = len(data)
        info.mode = 0o600
        tar.addfile(info, io.BytesIO(data))


def verify_archive(path: Path) -> dict:
    """Verifie tous les octets sans extraire de chemin fourni par l'archive."""
    actual = {}
    metadata = None
    total = 0
    with tarfile.open(path, "r:gz") as tar:
        for member in tar:
            require(member.isfile(), "Lien ou fichier special dans l'archive")
            require(member.size >= 0, "Taille invalide")
            total += member.size
            require(total < LIMIT and len(actual) <= MAX_FILES, "Archive hors limites")
            stream = tar.extractfile(member)
            require(stream is not None, "Contenu absent")
            if member.name == "manifest.json":
                require(metadata is None and member.size < 32_000_000, "Manifeste invalide ou repete")
                metadata = json.load(stream)
            else:
                require(member.name.startswith("site/"), "Membre inattendu dans l'archive")
                name = member.name[5:]
                safe_public_path(name)
                require(name not in actual, "Fichier duplique dans l'archive")
                actual[name] = {"size": member.size, "sha256": sha256(stream)}
    require(isinstance(metadata, dict) and metadata.get("schema") == 1, "Manifeste manquant")
    require(actual == metadata.get("files") and actual.get("index.html", {}).get("size", 0) > 0,
            "Integrite des fichiers differente du manifeste")
    safe_id(metadata["active_release"])
    return metadata


def run(*args: str, **kwargs):
    return subprocess.run(args, check=True, timeout=kwargs.pop("timeout", 240), **kwargs)


def gh_json(*args: str):
    return json.loads(run("gh", *args, stdout=subprocess.PIPE).stdout)


def private_repository() -> None:
    require(bool(os.environ.get("GH_TOKEN")), "Secret BACKUPS_REPOSITORY_TOKEN absent")
    repo = gh_json("api", f"repos/{DESTINATION}")
    require(repo.get("private") is True and repo.get("full_name") == DESTINATION,
            "Destination non privee ou incorrecte")
    require(repo.get("default_branch") == "main", "Branche cible inattendue dans le depot prive")


def verify_bundle(bundle: Path, mirror: Path, destination: Path, commit: str) -> None:
    run("git", "clone", "--quiet", "--mirror", str(bundle), str(destination))
    run("git", "--git-dir=" + str(destination), "fsck", "--full", "--no-reflogs", stdout=subprocess.DEVNULL)
    command = ("for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/tags")
    expected = run("git", "--git-dir=" + str(mirror), *command, stdout=subprocess.PIPE).stdout
    restored = run("git", "--git-dir=" + str(destination), *command, stdout=subprocess.PIPE).stdout
    require(bool(expected.strip()) and expected == restored, "References Git restaurees incoherentes")
    run("git", "--git-dir=" + str(destination), "cat-file", "-e", commit + "^{commit}")


def publication_backup(phase: str, operation: str, commit: str, ssh_config: Path, receipt: Path) -> None:
    require(phase in {"avant", "apres", "controle"}, "Phase inconnue")
    safe_id(operation)
    require(bool(re.fullmatch(r"[0-9a-f]{40}", commit)), "Commit invalide")
    private_repository()
    tag = f"backup-deadelustv-git-publication-{operation}-{phase}"
    with tempfile.TemporaryDirectory(prefix="publication-", dir=os.environ.get("RUNNER_TEMP")) as folder:
        work = Path(folder)
        archive = work / (tag + ".site.tar.gz")
        with archive.open("wb") as out:
            run("ssh", "-F", str(ssh_config), "ovh-deadelustv", "python3", "-", "_capture", phase,
                operation, commit, input=Path(__file__).read_bytes(), stdout=out, timeout=600)
        metadata = verify_archive(archive)
        require(metadata["phase"] == phase and metadata["operation"] == operation
                and metadata["deployment_commit"] == commit, "Reponse de capture incoherente")
        mirror = work / "source.git"
        run("git", "clone", "--quiet", "--mirror", f"https://github.com/{SOURCE}.git", str(mirror), timeout=600)
        bundle = work / (tag + ".git.bundle")
        run("git", "--git-dir=" + str(mirror), "cat-file", "-e", commit + "^{commit}")
        run("git", "--git-dir=" + str(mirror), "bundle", "create", str(bundle), "--all", timeout=600)
        require(archive.stat().st_size < LIMIT and bundle.stat().st_size < LIMIT, "Piece jointe trop volumineuse")
        hashes = {p.name: file_hash(p) for p in (archive, bundle)}
        sums = work / (tag + ".sha256")
        sums.write_text("".join(f"{digest}  {name}\n" for name, digest in hashes.items()), "utf-8")
        notes = (f"Sauvegarde {phase}. Operation {operation}. Commit de la publication : {commit}. "
                 f"Version OVH effectivement capturee : {metadata['active_release']}. "
                 "Contient les fichiers publics servis et le miroir Git. Ne couvre pas Supabase, "
                 "les secrets ou la configuration systeme OVH. Controle SHA256 et restauration Git verifies avant validation.")
        run("gh", "release", "create", tag, str(archive), str(bundle), str(sums),
            "--repo", DESTINATION, "--target", "main", "--draft", "--latest=false",
            "--title", f"Site {phase.upper()} publication {operation}", "--notes", notes, timeout=600,
            stdout=subprocess.DEVNULL)
        downloaded = work / "downloaded"
        downloaded.mkdir()
        run("gh", "release", "download", tag, "--repo", DESTINATION, "--dir", str(downloaded), timeout=600)
        require({p.name for p in downloaded.iterdir()} == {archive.name, bundle.name, sums.name}, "Pieces jointes incompletes")
        require((downloaded / sums.name).read_bytes() == sums.read_bytes(), "Sommes distantes incorrectes")
        for name, digest in hashes.items():
            require(file_hash(downloaded / name) == digest, "Archive distante alteree")
        require(verify_archive(downloaded / archive.name) == metadata, "Manifeste distant incoherent")
        verify_bundle(downloaded / bundle.name, mirror, work / "restored.git", commit)
        # Une archive partielle reste un brouillon : jamais une preuve permettant de publier.
        run("gh", "release", "edit", tag, "--repo", DESTINATION, "--draft=false", "--latest=false")
        release = gh_json("release", "view", tag, "--repo", DESTINATION, "--json", "isDraft,tagName,url")
        require(release.get("isDraft") is False and release.get("tagName") == tag, "Sauvegarde non publiee")
        result = {"verified": True, "phase": phase, "operation": operation, "commit": commit,
                  "active_release": metadata["active_release"], "archive_sha256": hashes[archive.name],
                  "release_url": release["url"]}
        receipt.write_text(json.dumps(result), "utf-8")
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
                summary.write(f"\n### Sauvegarde {phase} verifiee\nVersion OVH : `{metadata['active_release']}`. "
                              f"Fichiers publics : {len(metadata['files'])}. Archive et miroir Git recuperes et controles. "
                              f"[Release privee]({release['url']})\n")
        print(f"Sauvegarde {phase} verifiee pour l'operation {operation}.")


def main() -> None:
    # python3 - _capture phase operation commit donne cinq arguments au total.
    if len(sys.argv) == 5 and sys.argv[1] == "_capture":
        capture(BASE, sys.argv[2], sys.argv[3], sys.argv[4], sys.stdout.buffer)
        return
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", required=True, choices=["avant", "apres", "controle"])
    parser.add_argument("--operation", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--ssh-config", required=True, type=Path)
    parser.add_argument("--receipt", required=True, type=Path)
    a = parser.parse_args()
    publication_backup(a.phase, a.operation, a.commit, a.ssh_config, a.receipt)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, tarfile.TarError, subprocess.SubprocessError) as error:
        print(f"ERREUR sauvegarde : {error}", file=sys.stderr)
        sys.exit(1)
