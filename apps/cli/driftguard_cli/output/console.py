"""Rich console output for scan results and plan summaries."""

from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich import box

from driftguard_cli.scanner.engine import ScanResult, Severity
from driftguard_cli.plan import PlanSummary, ChangeAction

console = Console()

_SEV_COLOURS = {
    "critical": "bold red",
    "high": "red",
    "medium": "yellow",
    "low": "cyan",
    "info": "dim",
}

_RISK_COLOURS = {
    "critical": "bold red",
    "high": "red",
    "medium": "yellow",
    "low": "green",
}


def _sev_badge(sev: str) -> Text:
    colour = _SEV_COLOURS.get(sev.lower(), "white")
    return Text(sev.upper(), style=colour)


def print_scan_result(result: ScanResult, path: str, verbose: bool = False) -> None:
    if not result.findings:
        console.print(Panel(
            f"[bold green]✓ No findings in {path}[/bold green]",
            border_style="green",
        ))
        return

    table = Table(
        box=box.ROUNDED,
        show_header=True,
        header_style="bold",
        title=f"[bold]Scan Results — {path}[/bold]",
        expand=True,
    )
    table.add_column("Severity", width=10, no_wrap=True)
    table.add_column("Rule", width=10, no_wrap=True)
    table.add_column("Resource", min_width=20)
    table.add_column("Finding")
    if verbose:
        table.add_column("File:Line", width=20)

    # Sort: critical first
    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    sorted_findings = sorted(result.findings, key=lambda f: sev_order.get(str(f.severity).lower(), 5))

    for f in sorted_findings:
        sev = str(f.severity).lower()
        colour = _SEV_COLOURS.get(sev, "white")
        row = [
            Text(sev.upper(), style=colour),
            Text(f.rule_id, style="bold cyan"),
            Text(f.resource or "-", overflow="fold"),
            Text(f.title),
        ]
        if verbose:
            loc = f"{f.file}:{f.line}" if f.line else f.file
            row.append(Text(loc, style="dim"))
        table.add_row(*row)

    console.print(table)

    if verbose:
        for f in sorted_findings:
            if f.suggestion:
                sev = str(f.severity).lower()
                colour = _SEV_COLOURS.get(sev, "white")
                console.print(f"  [{colour}]{f.rule_id}[/{colour}] {f.title}")
                console.print(f"    [dim]→[/dim] {f.message}")
                console.print(f"    [green]Fix:[/green] {f.suggestion}")
                console.print()

    _print_scan_summary(result)


def _print_scan_summary(result: ScanResult) -> None:
    score_colour = (
        "bold red" if result.risk_score >= 80
        else "red" if result.risk_score >= 60
        else "yellow" if result.risk_score >= 30
        else "green"
    )
    parts = []
    if result.critical:
        parts.append(f"[bold red]{result.critical} critical[/bold red]")
    if result.high:
        parts.append(f"[red]{result.high} high[/red]")
    if result.medium:
        parts.append(f"[yellow]{result.medium} medium[/yellow]")
    if result.low:
        parts.append(f"[cyan]{result.low} low[/cyan]")

    summary = "  ".join(parts) or "[green]none[/green]"
    console.print(
        f"\n[bold]Files scanned:[/bold] {result.files_scanned}  "
        f"[bold]Total findings:[/bold] {len(result.findings)}  ({summary})\n"
        f"[bold]Risk score:[/bold] [{score_colour}]{result.risk_score}/100[/{score_colour}]"
    )


def print_plan_summary(summary: PlanSummary, verbose: bool = False) -> None:
    risk_colour = _RISK_COLOURS.get(summary.risk_level, "white")

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold", title="[bold]Plan Changes[/bold]")
    table.add_column("Action", width=10)
    table.add_column("Resource")
    table.add_column("Type", width=25)
    table.add_column("Provider", width=15)

    action_colours = {
        ChangeAction.CREATE: "green",
        ChangeAction.UPDATE: "yellow",
        ChangeAction.DELETE: "red",
        ChangeAction.REPLACE: "bold red",
    }

    for ch in summary.changes:
        colour = action_colours.get(ch.action, "white")
        action_label = "~replace~" if ch.action == ChangeAction.REPLACE else ch.action.value
        table.add_row(
            Text(action_label.upper(), style=colour),
            Text(ch.address),
            Text(ch.type, style="dim"),
            Text(ch.short_provider, style="dim"),
        )

    console.print(table)

    console.print(
        f"\n[bold]Changes:[/bold] "
        f"[green]+{summary.creates}[/green] create  "
        f"[yellow]~{summary.updates}[/yellow] update  "
        f"[red]-{summary.deletes}[/red] delete  "
        f"[bold red]↺{summary.replaces}[/bold red] replace"
    )
    console.print(
        f"[bold]Risk score:[/bold] [{risk_colour}]{summary.risk_score}/100 ({summary.risk_level.upper()})[/{risk_colour}]"
    )

    if verbose and summary.risk_factors:
        console.print("\n[bold]Risk factors:[/bold]")
        for f in summary.risk_factors:
            console.print(f"  • {f}")
