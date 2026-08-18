"""Helpers for reading Anthropic response content safely.

`Message.content` is a list of a dozen block types (text, thinking, tool
use, server tool results, ...) and only `TextBlock` carries `.text`.
Reaching for `.text` directly type-checks as an error on every other
member of that union -- it accounted for roughly a third of this
package's mypy findings -- and at runtime it raises `AttributeError` the
first time a response leads with a non-text block.

Narrowing in one place keeps the call sites both typed and correct, and
makes the intended behaviour explicit: non-text blocks contribute
nothing rather than crashing the request.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any


def text_from_blocks(content: Iterable[Any] | None) -> str:
    """Concatenate the text of every text block, skipping all other kinds."""
    if not content:
        return ""
    return "".join(
        block.text
        for block in content
        if getattr(block, "type", None) == "text" and isinstance(getattr(block, "text", None), str)
    )
