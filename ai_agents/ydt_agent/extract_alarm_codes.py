#!/usr/bin/env python3
"""Extract the AIM-7510 alarm list (sec. 18) in EN/TR/RU from the manual chapters.

Each entry is "0xCODE Title" followed by numbered detail lines ("1. ..." cause,
"2. ..." remedy). The alarm list appears once per language at different page
ranges; this script auto-detects the language from the section header and merges
the three language versions by alarm code (codes are shared across languages).

Faithful to the manual: codes and wording are extracted as printed, not invented.
"""
import argparse
import json
import re
import sys
from pathlib import Path

# Section headers per language. Order matters: Turkish "LİSTESİ" must not be
# matched by the English "ALARM LIST" test, and Russian has no "ALARM" at all.
LANG_MARKERS = [
    ("ТРЕВОГИ", "ru"),
    ("LİSTESİ", "tr"),
    ("ALARM LIST", "en"),
]

# Exactly four hex digits after 0x (e.g. 0x1200, 0xA007, 0x120c).
CODE_RE = re.compile(r"^\s*(0x[0-9A-Fa-f]{4})\s*(.*)$")


def detect_lang(line: str):
    upper = line.upper()
    for marker, lang in LANG_MARKERS:
        if marker in upper:
            return lang
    return None


def extract_chapter(path: Path, alarms: dict):
    current_lang = None
    current_code = None
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            continue

        lang = detect_lang(stripped)
        if lang:
            current_lang = lang
            current_code = None
            continue
        if current_lang is None:
            continue

        m = CODE_RE.match(line)
        if m:
            code = "0x" + m.group(1)[2:].upper()  # "0xA00C" for stable lookup/display
            title = m.group(2).strip()
            entry = alarms.setdefault(code, {
                "code": code,
                "en": {"title": None, "detail": []},
                "tr": {"title": None, "detail": []},
                "ru": {"title": None, "detail": []},
            })
            if title:
                entry[current_lang]["title"] = title
            current_code = code
        elif current_code:
            alarms[current_code][current_lang]["detail"].append(stripped)


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--machine", default="aim-7510")
    parser.add_argument("--knowledge-dir", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args(argv)

    if args.knowledge_dir:
        knowledge = Path(args.knowledge_dir)
    else:
        here = Path(__file__).resolve().parent
        candidates = [
            here.parent / "knowledge",
            here.parent / "ai_agents" / "ydt_agent" / "knowledge",
        ]
        knowledge = next((c for c in candidates if c.exists()), candidates[0])

    text_dir = knowledge / "processed" / args.machine / "text"
    if not text_dir.exists():
        print(f"[alarm-extract] missing text dir: {text_dir}", file=sys.stderr)
        return 2

    alarms = {}
    for chapter in sorted(text_dir.glob("chapter_*.txt")):
        extract_chapter(chapter, alarms)

    ordered = [alarms[k] for k in sorted(alarms, key=lambda c: (len(c), c))]
    reference = {
        "machine_id": args.machine,
        "description": (
            "AIM-7510 alarm list (manual section 18: NC300 control unit, PLC, "
            "G-code, macro and HMI alarms) extracted in EN/TR/RU."
        ),
        "languages": ["en", "tr", "ru"],
        "source_document": "MKK.028_1ET089000-0122_AIM_7510_(20.07.2020)_REV.07.pdf",
        "source_section": "18. Alarm List",
        "alarm_count": len(ordered),
        "alarms": ordered,
    }

    out = Path(args.out) if args.out else knowledge / "processed" / args.machine / "alarm_codes.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(reference, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    full = sum(1 for a in ordered if a["en"]["title"] and a["tr"]["title"] and a["ru"]["title"])
    print(
        f"[alarm-extract] {args.machine}: {len(ordered)} alarms; "
        f"{full} with en+tr+ru title; written -> {out}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
