import asyncio
import json
import os
from pathlib import Path

from driftguard.core.logging import log


class TerraformError(RuntimeError):
    pass


async def _run(
    *args: str,
    cwd: Path,
    timeout: int = 180,
    extra_env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    env = dict(os.environ)
    env.update({"TF_IN_AUTOMATION": "1", "TF_INPUT": "0", "PATH": _path_env()})
    if extra_env:
        env.update(extra_env)

    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except TimeoutError:
        proc.kill()
        raise TerraformError(f"timeout after {timeout}s: {args[0]}") from None
    return proc.returncode or 0, stdout.decode(errors="replace"), stderr.decode(errors="replace")


def _path_env() -> str:
    return os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin")


def _binary() -> str:
    import shutil

    for cand in ("tofu", "terraform"):
        if shutil.which(cand):
            return cand
    raise TerraformError("neither tofu nor terraform found in PATH")


async def init(cwd: Path, backend_config: dict[str, str] | None = None, extra_env: dict | None = None) -> None:
    args = [_binary(), "init", "-input=false", "-no-color"]
    if backend_config:
        for k, v in backend_config.items():
            args += [f"-backend-config={k}={v}"]
    else:
        args.append("-backend=false")

    code, _, err = await _run(*args, cwd=cwd, extra_env=extra_env)
    if code != 0:
        raise TerraformError(f"init failed: {err.strip()[:500]}")


async def plan(cwd: Path, extra_env: dict | None = None) -> Path:
    plan_bin = cwd / "tfplan.bin"
    code, _, err = await _run(
        _binary(),
        "plan",
        "-input=false",
        "-no-color",
        f"-out={plan_bin.name}",
        cwd=cwd,
        timeout=300,
        extra_env=extra_env,
    )
    if code not in (0, 2):
        raise TerraformError(f"plan failed: {err.strip()[:500]}")
    return plan_bin


async def show_json(cwd: Path, plan_bin: Path, extra_env: dict | None = None) -> dict:
    code, out, err = await _run(
        _binary(),
        "show",
        "-json",
        "-no-color",
        plan_bin.name,
        cwd=cwd,
        extra_env=extra_env,
    )
    if code != 0:
        raise TerraformError(f"show failed: {err.strip()[:500]}")
    return json.loads(out)


async def analyze_directory(
    tf_dir: Path,
    aws_env: dict[str, str] | None = None,
    backend_config: dict[str, str] | None = None,
) -> dict | None:
    log.info("tf_analyze_start", dir=str(tf_dir), has_aws_creds=bool(aws_env))
    try:
        await init(tf_dir, backend_config=backend_config, extra_env=aws_env)
        plan_bin = await plan(tf_dir, extra_env=aws_env)
        plan_json = await show_json(tf_dir, plan_bin, extra_env=aws_env)
        log.info("tf_analyze_ok", dir=str(tf_dir), resources=len(plan_json.get("resource_changes", [])))
        return plan_json
    except TerraformError as e:
        log.warning("tf_analyze_failed", dir=str(tf_dir), error=str(e))
        return None
