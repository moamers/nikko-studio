#!/usr/bin/env python3
"""Validate every relative Markdown link and heading anchor in the docs set.

The documentation is heavily cross-linked by design (see docs/README.md
"Documentation conventions"), so a renamed heading silently breaks navigation.
This catches that.

Usage:  python3 scripts/check-docs-links.py [--quiet]
Exit:   0 = all links resolve, 1 = at least one is broken.
"""
from __future__ import annotations

import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCAN_DIRS = ("docs",)
SCAN_FILES = ("README.md",)

LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)\s]+)\)")
HEADING_RE = re.compile(r"^#{1,6}\s+(.*?)\s*$", re.M)
FENCE_RE = re.compile(r"^\s*```")
# Dingbats/arrows/misc-symbols + emoji planes: GitHub drops these from anchors.
SYMBOL_RE = re.compile(r"[←-⯿\U0001F000-\U0001FAFF]")


def markdown_files() -> list[str]:
    found: list[str] = []
    for d in SCAN_DIRS:
        for dirpath, _, filenames in os.walk(os.path.join(ROOT, d)):
            found += [
                os.path.join(dirpath, f) for f in sorted(filenames) if f.endswith(".md")
            ]
    found += [os.path.join(ROOT, f) for f in SCAN_FILES]
    return [f for f in found if os.path.exists(f)]


def strip_fences(text: str) -> str:
    """Blank out fenced code blocks so sample links aren't treated as real."""
    out, inside = [], False
    for line in text.split("\n"):
        if FENCE_RE.match(line):
            inside = not inside
            out.append("")
            continue
        out.append("" if inside else line)
    return "\n".join(out)


def slugify(heading: str) -> str:
    """Reproduce GitHub's heading-anchor algorithm.

    Note it does NOT collapse runs of whitespace, so "P1 — Motion" (with the
    em dash removed) yields "p1--motion" with a double hyphen.
    """
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", heading)  # links -> label
    for ch in "`*_~":
        text = text.replace(ch, "")
    text = re.sub(r"[^\w\s-]", "", text.strip().lower(), flags=re.UNICODE)
    return SYMBOL_RE.sub("", text).replace(" ", "-")


def main() -> int:
    quiet = "--quiet" in sys.argv
    files = markdown_files()
    if not files:
        print("check-docs-links: no markdown files found", file=sys.stderr)
        return 1

    anchors = {
        os.path.normpath(f): {
            slugify(m.group(1)) for m in HEADING_RE.finditer(strip_fences(open(f, encoding="utf-8").read()))
        }
        for f in files
    }

    broken: list[tuple[str, str, str]] = []
    checked = 0
    for f in files:
        body = strip_fences(open(f, encoding="utf-8").read())
        for match in LINK_RE.finditer(body):
            link = match.group(2)
            if link.startswith(("http://", "https://", "mailto:", "tel:")):
                continue
            checked += 1
            path, _, frag = link.partition("#")
            path = urllib.parse.unquote(path)
            target = (
                os.path.normpath(f)
                if path == ""
                else os.path.normpath(os.path.join(os.path.dirname(f), path))
            )
            rel = os.path.relpath(f, ROOT)
            if not os.path.exists(target):
                broken.append((rel, link, "missing file"))
            elif frag and target.endswith(".md") and frag not in anchors.get(target, set()):
                broken.append((rel, link, "missing anchor"))

    total_headings = sum(len(v) for v in anchors.values())
    if broken:
        print(f"\n✗ {len(broken)} broken link(s):\n")
        for src, link, why in sorted(set(broken)):
            print(f"    {src}\n      -> {link}  [{why}]")
        print()
        return 1

    if not quiet:
        print(
            f"✓ {checked} relative links resolve "
            f"({len(files)} files, {total_headings} headings)"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
