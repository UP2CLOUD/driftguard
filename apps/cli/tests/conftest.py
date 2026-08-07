"""Pytest collection-time setup.

Must run before driftguard_cli.main (or anything importing it) is ever
imported — main.py and output/console.py construct module-level Rich
Console() singletons at import time, which decide ANSI colour support once
from the ambient environment. A per-invoke CliRunner(env=...) override is
too late to affect those already-constructed instances, so NO_COLOR has to
be set here instead, before pytest collects any test module.
"""

import os

os.environ["NO_COLOR"] = "1"
os.environ.pop("FORCE_COLOR", None)
