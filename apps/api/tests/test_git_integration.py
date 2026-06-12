import io
import tarfile
import tempfile
from pathlib import Path

from driftguard.integrations.git import _extract_safe, find_terraform_dirs


def test_find_terraform_dirs_skips_excluded(tmp_path: Path):
    (tmp_path / "envs/prod").mkdir(parents=True)
    (tmp_path / "envs/prod/main.tf").write_text('resource "x" "y" {}')
    (tmp_path / "modules/vpc").mkdir(parents=True)
    (tmp_path / "modules/vpc/main.tf").write_text('resource "x" "y" {}')
    (tmp_path / ".terraform/lock").mkdir(parents=True)
    (tmp_path / ".terraform/lock/main.tf").write_text("ignored")
    (tmp_path / "node_modules/some/path").mkdir(parents=True)
    (tmp_path / "node_modules/some/path/main.tf").write_text("ignored")

    dirs = find_terraform_dirs(tmp_path)
    rel = sorted(str(d.relative_to(tmp_path)) for d in dirs)
    assert rel == ["envs/prod", "modules/vpc"]


def test_find_terraform_dirs_empty_dir(tmp_path: Path):
    assert find_terraform_dirs(tmp_path) == []


def test_find_terraform_dirs_single_file(tmp_path: Path):
    (tmp_path / "main.tf").write_text('resource "x" "y" {}')
    dirs = find_terraform_dirs(tmp_path)
    assert dirs == [tmp_path]


def test_find_terraform_dirs_skips_git(tmp_path: Path):
    (tmp_path / ".git/hooks").mkdir(parents=True)
    (tmp_path / ".git/hooks/main.tf").write_text("ignored")
    (tmp_path / "src").mkdir()
    (tmp_path / "src/main.tf").write_text('resource "x" "y" {}')
    dirs = find_terraform_dirs(tmp_path)
    rel = [str(d.relative_to(tmp_path)) for d in dirs]
    assert ".git/hooks" not in rel
    assert "src" in rel


def test_find_terraform_dirs_deduplicates(tmp_path: Path):
    """Multiple .tf files in the same dir yield only one entry."""
    (tmp_path / "infra").mkdir()
    (tmp_path / "infra/main.tf").write_text("")
    (tmp_path / "infra/variables.tf").write_text("")
    dirs = find_terraform_dirs(tmp_path)
    assert len(dirs) == 1


def test_find_terraform_dirs_sorted(tmp_path: Path):
    """Result is sorted."""
    for name in ("z", "a", "m"):
        (tmp_path / name).mkdir()
        (tmp_path / name / "main.tf").write_text("")
    dirs = find_terraform_dirs(tmp_path)
    assert dirs == sorted(dirs)


# ── _extract_safe ─────────────────────────────────────────────────────────────


def _make_tarball(members: dict[str, bytes]) -> Path:
    """Build a .tar.gz in a temp file with the given {name: content} members."""
    tmp = tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False)
    with tarfile.open(tmp.name, "w:gz") as tar:
        for name, content in members.items():
            info = tarfile.TarInfo(name=name)
            info.size = len(content)
            tar.addfile(info, io.BytesIO(content))
    return Path(tmp.name)


def test_extract_safe_normal_file(tmp_path: Path):
    tarball = _make_tarball({"repo-abc123/main.tf": b'resource "x" "y" {}'})
    dest = tmp_path / "extracted"
    dest.mkdir()
    _extract_safe(tarball, dest)
    assert (dest / "repo-abc123" / "main.tf").exists()


def test_extract_safe_path_traversal_rejected(tmp_path: Path):
    """Tarball entries that escape the dest dir must raise RuntimeError."""
    import pytest

    tarball = _make_tarball({"../evil.sh": b"malicious"})
    dest = tmp_path / "safe_dest"
    dest.mkdir()
    with pytest.raises(RuntimeError, match="unsafe tar entry"):
        _extract_safe(tarball, dest)
