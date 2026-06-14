"""DriftGuard CLI entry point."""

from __future__ import annotations

import asyncio
import sys
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Optional

import typer
from rich.console import Console

from driftguard_cli import __version__

app = typer.Typer(
    name="dg",
    help="DriftGuard — static IaC security scanner for Terraform, Kubernetes, and GitHub Actions.",
    no_args_is_help=True,
    rich_markup_mode="rich",
)

console = Console()
err_console = Console(stderr=True)


class OutputFormat(StrEnum):
    TABLE = "table"
    JSON = "json"
    SARIF = "sarif"


# ── Version ───────────────────────────────────────────────────────────────────


def _version_callback(value: bool) -> None:
    if value:
        console.print(f"driftguard-cli [bold cyan]{__version__}[/bold cyan]")
        raise typer.Exit()


@app.callback()
def main(
    version: Annotated[
        Optional[bool],
        typer.Option("--version", "-V", callback=_version_callback, is_eager=True, help="Show version and exit."),
    ] = None,
) -> None:
    pass


# ── scan ──────────────────────────────────────────────────────────────────────


@app.command()
def scan(
    path: Annotated[
        Path,
        typer.Argument(help="Directory to scan. Defaults to current directory.", show_default=False),
    ] = Path("."),
    output: Annotated[OutputFormat, typer.Option("-o", "--output", help="Output format.")] = OutputFormat.TABLE,
    verbose: Annotated[bool, typer.Option("-v", "--verbose", help="Show fix suggestions and file locations.")] = False,
    min_severity: Annotated[
        str,
        typer.Option("--min-severity", "-s", help="Minimum severity to report (info/low/medium/high/critical)."),
    ] = "info",
    fail_on: Annotated[
        Optional[str],
        typer.Option("--fail-on", help="Exit code 1 if findings at or above this severity exist. E.g. --fail-on high"),
    ] = None,
) -> None:
    """
    Scan a directory for IaC security issues.

    Recursively scans for Terraform (.tf), Kubernetes YAML, and GitHub Actions
    workflow files, applying all built-in rules.

    [bold]Examples:[/bold]

      [cyan]dg scan .[/cyan]                          Scan current directory
      [cyan]dg scan ./infra -o json[/cyan]            JSON output
      [cyan]dg scan ./infra -o sarif[/cyan]           SARIF for GitHub Code Scanning
      [cyan]dg scan ./infra --fail-on high[/cyan]     CI gate: exit 1 on high+ findings
      [cyan]dg scan ./infra -v[/cyan]                 Show fix suggestions
    """
    from driftguard_cli.scanner.engine import scan_directory, Severity
    from driftguard_cli.output import console as out_console, json_fmt, sarif

    if not path.exists():
        err_console.print(f"[red]Error:[/red] path does not exist: {path}")
        raise typer.Exit(code=2)

    if not path.is_dir():
        err_console.print(f"[red]Error:[/red] path is not a directory: {path}")
        raise typer.Exit(code=2)

    result = asyncio.run(scan_directory(path))

    # Filter by min severity
    sev_order = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
    min_sev_val = sev_order.get(min_severity.lower(), 0)
    if min_sev_val > 0:
        result.findings = [f for f in result.findings if sev_order.get(str(f.severity).lower(), 0) >= min_sev_val]

    if output == OutputFormat.JSON:
        data = json_fmt.scan_to_dict(result)
        print(json_fmt.dump(data))
    elif output == OutputFormat.SARIF:
        sarif_doc = sarif.to_sarif(result)
        print(sarif.dump(sarif_doc))
    else:
        out_console.print_scan_result(result, str(path), verbose=verbose)

    # CI gate
    if fail_on:
        fail_sev = sev_order.get(fail_on.lower(), 3)
        has_blocker = any(sev_order.get(str(f.severity).lower(), 0) >= fail_sev for f in result.findings)
        if has_blocker:
            if output == OutputFormat.TABLE:
                err_console.print(f"\n[bold red]✗ Failing: findings at or above '{fail_on}' severity found.[/bold red]")
            raise typer.Exit(code=1)


# ── check ─────────────────────────────────────────────────────────────────────


@app.command()
def check(
    path: Annotated[
        Path,
        typer.Argument(help="Directory to scan."),
    ] = Path("."),
    severity: Annotated[
        str,
        typer.Option("--severity", "-s", help="Severity threshold that causes a non-zero exit."),
    ] = "high",
    output: Annotated[OutputFormat, typer.Option("-o", "--output")] = OutputFormat.TABLE,
) -> None:
    """
    Scan and exit non-zero if findings meet the severity threshold.

    Designed for CI/CD pipelines. Equivalent to [cyan]dg scan --fail-on <severity>[/cyan].

    [bold]Examples:[/bold]

      [cyan]dg check .[/cyan]                     Fail on high or critical findings
      [cyan]dg check . --severity critical[/cyan]  Only fail on critical
      [cyan]dg check . -o json[/cyan]             JSON output (parseable in CI)
    """
    from driftguard_cli.scanner.engine import scan_directory
    from driftguard_cli.output import console as out_console, json_fmt

    if not path.exists() or not path.is_dir():
        err_console.print(f"[red]Error:[/red] {path} is not a valid directory")
        raise typer.Exit(code=2)

    result = asyncio.run(scan_directory(path))

    sev_order = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
    threshold = sev_order.get(severity.lower(), 3)

    blocking = [f for f in result.findings if sev_order.get(str(f.severity).lower(), 0) >= threshold]

    if output == OutputFormat.JSON:
        import json
        data = json_fmt.scan_to_dict(result)
        data["check"] = {"severity_threshold": severity, "blocking_count": len(blocking), "passed": len(blocking) == 0}
        print(json_fmt.dump(data))
    else:
        out_console.print_scan_result(result, str(path))

    if blocking:
        if output == OutputFormat.TABLE:
            err_console.print(f"\n[bold red]✗ {len(blocking)} blocking finding(s) at '{severity}' or above.[/bold red]")
        raise typer.Exit(code=1)
    elif output == OutputFormat.TABLE:
        console.print(f"\n[bold green]✓ No findings at '{severity}' or above. Safe to merge.[/bold green]")


# ── analyze ───────────────────────────────────────────────────────────────────


@app.command()
def analyze(
    plan_file: Annotated[
        Path,
        typer.Argument(help="Terraform plan JSON file (output of `terraform show -json plan.out > plan.json`)."),
    ],
    output: Annotated[OutputFormat, typer.Option("-o", "--output")] = OutputFormat.TABLE,
    verbose: Annotated[bool, typer.Option("-v", "--verbose", help="Show risk factors.")] = False,
    fail_on: Annotated[
        Optional[str],
        typer.Option("--fail-on", help="Exit 1 if risk level meets threshold (low/medium/high/critical)."),
    ] = None,
) -> None:
    """
    Analyse a Terraform plan JSON for risk.

    Parses the plan, scores each change by type and action, and produces a
    deterministic 0-100 risk score — no LLM, no external calls.

    [bold]Generating a plan JSON:[/bold]

      [cyan]terraform plan -out=plan.out[/cyan]
      [cyan]terraform show -json plan.out > plan.json[/cyan]
      [cyan]dg analyze plan.json[/cyan]

    [bold]Examples:[/bold]

      [cyan]dg analyze plan.json[/cyan]
      [cyan]dg analyze plan.json -v[/cyan]              Show risk factors
      [cyan]dg analyze plan.json -o json[/cyan]         JSON output
      [cyan]dg analyze plan.json --fail-on high[/cyan]  CI gate
    """
    from driftguard_cli.plan import parse_plan
    from driftguard_cli.output import console as out_console, json_fmt

    if not plan_file.exists():
        err_console.print(f"[red]Error:[/red] file not found: {plan_file}")
        raise typer.Exit(code=2)

    try:
        summary = parse_plan(plan_file)
    except Exception as exc:
        err_console.print(f"[red]Error parsing plan:[/red] {exc}")
        raise typer.Exit(code=2) from exc

    if output == OutputFormat.JSON:
        data = json_fmt.plan_to_dict(summary)
        print(json_fmt.dump(data))
    elif output == OutputFormat.SARIF:
        err_console.print("[yellow]SARIF output is not supported for plan analysis (use 'dg scan' for SARIF).[/yellow]")
        raise typer.Exit(code=2)
    else:
        out_console.print_plan_summary(summary, verbose=verbose)

    if fail_on:
        level_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        threshold = level_order.get(fail_on.lower(), 2)
        actual = level_order.get(summary.risk_level, 0)
        if actual >= threshold:
            if output == OutputFormat.TABLE:
                err_console.print(
                    f"\n[bold red]✗ Risk level '{summary.risk_level}' meets or exceeds threshold '{fail_on}'.[/bold red]"
                )
            raise typer.Exit(code=1)


# ── rules ─────────────────────────────────────────────────────────────────────


@app.command()
def rules(
    category: Annotated[
        Optional[str],
        typer.Option("--category", "-c", help="Filter by category (terraform/kubernetes/github_actions)."),
    ] = None,
    output: Annotated[OutputFormat, typer.Option("-o", "--output")] = OutputFormat.TABLE,
) -> None:
    """
    List all built-in security rules.

    [bold]Examples:[/bold]

      [cyan]dg rules[/cyan]                         Show all rules
      [cyan]dg rules --category terraform[/cyan]     Only Terraform rules
      [cyan]dg rules -o json[/cyan]                  JSON output
    """
    import json as _json
    from rich.table import Table
    from rich import box

    _rules = _get_all_rules()

    if category:
        _rules = [r for r in _rules if r["category"].lower() == category.lower()]

    if output == OutputFormat.JSON:
        print(_json.dumps(_rules, indent=2))
        return

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold", title="[bold]DriftGuard Rules[/bold]")
    table.add_column("Rule ID", width=12, no_wrap=True)
    table.add_column("Category", width=15)
    table.add_column("Severity", width=10)
    table.add_column("Title")

    sev_colours = {"critical": "bold red", "high": "red", "medium": "yellow", "low": "cyan", "info": "dim"}

    for r in _rules:
        sev = r["severity"].lower()
        table.add_row(
            typer.style(r["id"], fg=typer.colors.CYAN),
            r["category"],
            typer.style(sev.upper(), fg=_sev_to_typer_colour(sev)),
            r["title"],
        )

    console.print(table)
    console.print(f"\n[dim]{len(_rules)} rules total[/dim]")


def _sev_to_typer_colour(sev: str) -> str:
    return {"critical": "red", "high": "red", "medium": "yellow", "low": "cyan"}.get(sev, "white")


def _get_all_rules() -> list[dict]:
    return [
        # Terraform
        {"id": "TF001", "category": "terraform", "severity": "critical", "title": "IAM policy allows all resources (*)"},
        {"id": "TF002", "category": "terraform", "severity": "high", "title": "S3 bucket missing public access block"},
        {"id": "TF003", "category": "terraform", "severity": "high", "title": "force_destroy enabled on storage resource"},
        {"id": "TF004", "category": "terraform", "severity": "high", "title": "RDS skip_final_snapshot enabled"},
        {"id": "TF005", "category": "terraform", "severity": "medium", "title": "RDS missing deletion protection"},
        {"id": "TF006", "category": "terraform", "severity": "high", "title": "Potential hardcoded secret"},
        {"id": "TF007", "category": "terraform", "severity": "high", "title": "Security group open to all IPv4 (0.0.0.0/0)"},
        {"id": "TF008", "category": "terraform", "severity": "medium", "title": "KMS key deletion window too short"},
        {"id": "TF009", "category": "terraform", "severity": "low", "title": "Missing provider version constraints"},
        {"id": "TF010", "category": "terraform", "severity": "medium", "title": "EBS volume not encrypted at rest"},
        {"id": "TF011", "category": "terraform", "severity": "low", "title": "Lambda missing reserved_concurrent_executions"},
        {"id": "TF012", "category": "terraform", "severity": "high", "title": "IAM policy allows all actions (*)"},
        {"id": "TF013", "category": "terraform", "severity": "critical", "title": "S3 bucket has public ACL"},
        {"id": "TF014", "category": "terraform", "severity": "critical", "title": "RDS instance publicly accessible"},
        {"id": "TF015", "category": "terraform", "severity": "medium", "title": "Secrets Manager secret missing rotation"},
        # Kubernetes
        {"id": "K8S001", "category": "kubernetes", "severity": "critical", "title": "Privileged container"},
        {"id": "K8S002", "category": "kubernetes", "severity": "medium", "title": "Missing resource limits"},
        {"id": "K8S003", "category": "kubernetes", "severity": "critical", "title": "hostPID / hostNetwork enabled"},
        {"id": "K8S004", "category": "kubernetes", "severity": "medium", "title": "Container may run as root"},
        {"id": "K8S005", "category": "kubernetes", "severity": "high", "title": "allowPrivilegeEscalation not disabled"},
        {"id": "K8S006", "category": "kubernetes", "severity": "medium", "title": "Image using :latest or untagged"},
        {"id": "K8S007", "category": "kubernetes", "severity": "low", "title": "Missing readinessProbe"},
        {"id": "K8S008", "category": "kubernetes", "severity": "medium", "title": "Container missing securityContext"},
        {"id": "K8S009", "category": "kubernetes", "severity": "low", "title": "Root filesystem is writable"},
        {"id": "K8S010", "category": "kubernetes", "severity": "critical", "title": "Container granted ALL capabilities"},
        # GitHub Actions
        {"id": "GHA001", "category": "github_actions", "severity": "high", "title": "Unpinned action (uses @branch)"},
        {"id": "GHA002", "category": "github_actions", "severity": "critical", "title": "ACTIONS_ALLOW_UNSECURE_COMMANDS enabled"},
        {"id": "GHA003", "category": "github_actions", "severity": "critical", "title": "Script injection via github.event interpolation"},
        {"id": "GHA004", "category": "github_actions", "severity": "medium", "title": "Workflow missing explicit permissions"},
        {"id": "GHA005", "category": "github_actions", "severity": "critical", "title": "pull_request_target with unsafe checkout"},
        {"id": "GHA006", "category": "github_actions", "severity": "high", "title": "Secret directly interpolated in run step"},
        {"id": "GHA007", "category": "github_actions", "severity": "high", "title": "Remote script execution via curl | bash"},
        {"id": "GHA008", "category": "github_actions", "severity": "medium", "title": "Untrusted event data in if: condition"},
    ]


if __name__ == "__main__":
    app()
