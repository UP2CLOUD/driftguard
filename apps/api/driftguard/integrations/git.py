import asyncio
import tarfile
from pathlib import Path

import httpx

from driftguard.core.logging import log


async def download_tarball(token: str, repo_full_name: str, ref: str, dest: Path) -> Path:
    url = f"https://api.github.com/repos/{repo_full_name}/tarball/{ref}"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    tarball = dest / "repo.tar.gz"

    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        async with client.stream("GET", url, headers=headers) as resp:
            resp.raise_for_status()
            with tarball.open("wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=64 * 1024):
                    f.write(chunk)

    extract_dir = dest / "src"
    extract_dir.mkdir()
    await asyncio.to_thread(_extract_safe, tarball, extract_dir)
    tarball.unlink(missing_ok=True)

    inner = next(extract_dir.iterdir())
    log.info("tarball_extracted", repo=repo_full_name, ref=ref, path=str(inner))
    return inner


def _extract_safe(tarball: Path, dest: Path) -> None:
    with tarfile.open(tarball, "r:gz") as tar:
        for member in tar.getmembers():
            target = (dest / member.name).resolve()
            if not str(target).startswith(str(dest.resolve())):
                raise RuntimeError(f"unsafe tar entry: {member.name}")
        tar.extractall(dest, filter="data")


def find_terraform_dirs(root: Path) -> list[Path]:
    dirs: set[Path] = set()
    for tf in root.rglob("*.tf"):
        if any(part in {".terraform", "node_modules", ".git"} for part in tf.parts):
            continue
        dirs.add(tf.parent)
    return sorted(dirs)
