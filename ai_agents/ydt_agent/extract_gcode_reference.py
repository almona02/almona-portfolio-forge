#!/usr/bin/env python3
"""Extract the multi-language G/M-code reference from the AIM-7510 manual chapters.

The manual ships the G/M-code function tables in Turkish, English and Russian.
This script scans the extracted chapter text files, auto-detects the language
section from the table header, parses every "Gnn"/"Mnn : description" line
(including G17Q-style suffixes and multi-line descriptions), and merges them
into one machine-scoped, multi-language reference.

Reusable for other machines: pass --machine <id> and --knowledge-dir <path>.
"""
import argparse
import json
import re
import sys
from pathlib import Path

# Table headers per language. Order matters: "G CODE FUNCTIONS" must be tested
# distinctly from Turkish/Russian so a chapter is tagged with the right language.
LANG_MARKERS = [
    ("G CODE FUNCTIONS", "en"),
    ("M CODE FUNCTIONS", "en"),
    ("G KODU FONKSİYONLARI", "tr"),
    ("M KODU FONKSİYONLARI", "tr"),
    ("ФУНКЦИИ G КОДИРОВКИ", "ru"),
    ("ФУНКЦИИ КОДИРОВКИ M", "ru"),
]

# "G320.1", "G17Q", "M118" — optional decimal + optional trailing letter suffix.
CMD_RE = re.compile(r"^\s*(G\d+(?:\.\d+)?[A-Za-z]?|M\d+)\s*:\s*(.*)$")


def detect_language(line: str):
    upper = line.upper()
    for marker, lang in LANG_MARKERS:
        if marker in upper:
            return lang
    return None


def extract_from_chapter(path: Path, commands: dict):
    """Parse one chapter text file into the shared `commands` dict."""
    current_lang = None
    current_code = None

    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            continue

        lang = detect_language(stripped)
        if lang:
            current_lang = lang
            current_code = None
            continue

        if current_lang is None:
            continue  # Not inside a G/M-code table (e.g. alarm list, TOC).

        m = CMD_RE.match(line)
        if m:
            code = m.group(1).upper()
            desc = m.group(2).strip()
            entry = commands.setdefault(
                code,
                {"code": code, "en": None, "tr": None, "ru": None, "sources": []},
            )
            if desc:
                entry[current_lang] = (
                    f"{entry[current_lang]} {desc}".strip()
                    if entry[current_lang]
                    else desc
                )
            current_code = code
        elif current_code:
            # Multi-line description continuation.
            entry = commands[current_code]
            entry[current_lang] = (
                f"{entry[current_lang]} {stripped}".strip()
                if entry[current_lang]
                else stripped
            )


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--machine", default="aim-7510")
    parser.add_argument(
        "--knowledge-dir",
        default=None,
        help="Path to ai_agents/ydt_agent/knowledge. Defaults to auto-detect.",
    )
    parser.add_argument("--out", default=None)
    args = parser.parse_args(argv)

    if args.knowledge_dir:
        knowledge = Path(args.knowledge_dir)
    else:
        here = Path(__file__).resolve().parent
        candidates = [
            here.parent / "knowledge",  # lives at ai_agents/ydt_agent/ in the repo
            here.parent / "ai_agents" / "ydt_agent" / "knowledge",
        ]
        knowledge = next((c for c in candidates if c.exists()), candidates[0])

    text_dir = knowledge / "processed" / args.machine / "text"
    if not text_dir.exists():
        print(f"[gcode-ref] missing text dir: {text_dir}", file=sys.stderr)
        return 2

    commands = {}
    chapters = sorted(text_dir.glob("chapter_*.txt"))
    for chapter in chapters:
        extract_from_chapter(chapter, commands)

    # Order by type then numeric value for stable output.
    def sort_key(item):
        code = item[0]
        prefix = 0 if code.startswith("G") else 1
        num = re.sub(r"[^0-9.]", "", code)
        try:
            val = float(num)
        except ValueError:
            val = 0.0
        return (prefix, val, code)

    ordered = [commands[k] for k in sorted(commands, key=sort_key)]

    reference = {
        "machine_id": args.machine,
        "description": (
            "Multi-language G/M-code reference extracted from the AIM-7510 "
            "operator manual (MKK.028_1ET089000-0122_AIM_7510, REV.07, 2020-07-20). "
            "Sections: 13. G code functions, 14. M code functions."
        ),
        "languages": ["en", "tr", "ru"],
        "source_document": "MKK.028_1ET089000-0122_AIM_7510_(20.07.2020)_REV.07.pdf",
        "command_count": len(ordered),
        "commands": ordered,
    }

    out = Path(args.out) if args.out else knowledge / "processed" / args.machine / "gcode_reference.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(reference, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # Report language coverage.
    langs = {c["code"]: [l for l in ("en", "tr", "ru") if c[l]] for c in ordered}
    full = sum(1 for v in langs.values() if len(v) == 3)
    print(
        f"[gcode-ref] {args.machine}: {len(ordered)} commands from "
        f"{len(chapters)} chapters; {full} with en+tr+ru; "
        f"written -> {out}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
