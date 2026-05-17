from pathlib import Path

from driftguard.integrations.git import find_terraform_dirs


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
