"""AIM-7510 G/M-code knowledge layer for the YDT engine.

Loads the machine-specific, multi-language G/M-code reference extracted from
the AIM-7510 operator manual (sections "13. G code functions" and "14. M code
functions"), plus the extracted specifications.

Design rules (see the YDT production review, 2026-10-19):
  * Nothing here validates or authorizes real machine execution. Every result
    is advisory.
  * Only limits actually present in specifications_gold_tier.json are treated
    as known. The previous version invented 7500 mm travel / 6000 mm/min feed /
    24000 RPM spindle — none of those are in the extracted spec, so they are
    removed.
  * The AIM-7510 uses G70/G71 for units (inch/mm) and G21 for Y-axis mirroring;
    it has no generic G81 drilling cycle and no generic M6 tool change. This
    layer follows the machine's real command set rather than generic CNC lore.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

FALLBACK_LANGUAGE = "en"
LANGUAGES = ("en", "tr", "ru")

# Specification keys we trust as real, extracted machine limits (label: meaning).
TRUSTED_LIMIT_KEYS: Dict[str, str] = {
    "working_x1": "X-axis working range",
    "working_y1": "Y-axis working range",
    "working_z1": "Z-axis working range",
    "rotary_a": "A-axis range",
    "rotary_c": "C-axis range",
    "spindle_speed": "Spindle max speed",
    "spindle_power": "Spindle power (S6)",
    "tool_collet": "Spindle taper",
    "saw_diameter": "Saw blade diameter",
    "saw_bore": "Saw bore",
    "saw_speed": "Saw speed",
    "saw_motor_power": "Saw motor power",
    "saw_thickness": "Saw thickness",
    "feed_x": "X-axis speed",
    "feed_y": "Y-axis speed",
    "feed_z": "Z-axis speed",
    "servo_motors": "Servo motor power",
    "tool_magazine_capacity": "Tool magazine capacity",
    "max_tool_diameter": "Max tool diameter",
    "max_tool_length": "Max tool length",
    "max_tool_weight": "Max tool weight",
    "clamp_vises": "Workpiece vises",
    "power_voltage": "Voltage",
    "power_frequency": "Frequency",
    "power_phase": "Phases",
    "power_consumption": "Total power",
    "air_pressure": "Air pressure",
    "air_consumption": "Air consumption",
    "weight_net": "Net weight",
    "weight_gross": "Gross weight",
    "dimension_length": "Overall length (net)",
    "dimension_width": "Overall width (net)",
    "dimension_height": "Overall height (net)",
    "dimension_packing": "Packing dimensions",
    "cnc_axes": "CNC axes",
}

# Specification keys the extraction still could not fill and which this layer
# must NOT invent. Reported to the user as "not extracted — see manual".
UNVERIFIED_LIMIT_KEYS: Dict[str, str] = {
    "power_amperage": "Power amperage",
    "working_x2": "X-axis working range (second value)",
    "working_y2": "Y-axis working range (second value)",
    "working_z2": "Z-axis working range (second value)",
    "clamping_width_max": "Clamping width max",
    "clamping_width_min": "Clamping width min",
    "clamping_height_max": "Clamping height max",
    "clamping_height_min": "Clamping height min",
    "clamping_length_max": "Clamping length max",
    "clamping_length_min": "Clamping length min",
}


class GCodeKnowledge:
    """Machine-specific G/M-code reference + honest capability limits."""

    def __init__(self, processed_dir: Path):
        self.processed_dir = Path(processed_dir)
        self.machine_id = self.processed_dir.name
        self.reference = self._load("gcode_reference.json", {})
        self.commands: Dict[str, Dict[str, Any]] = {
            c["code"]: c for c in self.reference.get("commands", [])
        }
        self.specs = self._load("specifications_gold_tier.json", {})
        self.known_limits = self._known_limits()
        self.unverified_limits = self._unverified_limits()

    # ------------------------------------------------------------------ io
    def _load(self, filename: str, default: Any) -> Any:
        path = self.processed_dir / filename
        if not path.exists():
            return default
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 - a broken reference must not crash chat
            return default

    def _known_limits(self) -> Dict[str, Dict[str, Any]]:
        out: Dict[str, Dict[str, Any]] = {}
        for key, label in TRUSTED_LIMIT_KEYS.items():
            value = self.specs.get(key)
            if value is not None:
                out[key] = {"label": label, "value": value}
        return out

    def _unverified_limits(self) -> List[Dict[str, str]]:
        return [{"key": k, "label": v} for k, v in UNVERIFIED_LIMIT_KEYS.items()]

    # ----------------------------------------------------- numeric limits
    _NUM_RE = re.compile(r"([+-]?\d+(?:\.\d+)?)")

    def _first_number(self, value: Any) -> Optional[float]:
        if value is None:
            return None
        m = self._NUM_RE.search(str(value))
        return float(m.group(1)) if m else None

    def spindle_rpm_limit(self) -> Optional[float]:
        return self._first_number(self.specs.get("spindle_speed"))

    def feed_mm_min_limits(self) -> Dict[str, Optional[float]]:
        """Per-axis speed limits in mm/min (source values are m/min)."""
        out: Dict[str, Optional[float]] = {}
        for axis in ("x", "y", "z"):
            raw = self._first_number(self.specs.get(f"feed_{axis}"))
            out[axis] = raw * 1000 if raw is not None else None
        return out

    # ------------------------------------------------------- localization
    def _localize(self, entry: Dict[str, Any], language: str) -> str:
        for lang in (language, FALLBACK_LANGUAGE, "en"):
            value = entry.get(lang)
            if value:
                return value
        return ""

    # ------------------------------------------------------ command lookup
    def explain_command(self, code: str, language: str = FALLBACK_LANGUAGE) -> Dict[str, Any]:
        code = code.strip().upper()
        entry = self.commands.get(code)
        if not entry:
            return {
                "code": code,
                "known": False,
                "description": (
                    f"{code} is not listed in the AIM-7510 manual G/M-code tables. "
                    "It may be controller-specific; verify against the machine's "
                    "controller manual."
                ),
                "source_document": self.reference.get("source_document"),
            }
        return {
            "code": entry["code"],
            "known": True,
            "description": self._localize(entry, language),
            "translations": {lang: entry[lang] for lang in LANGUAGES if entry.get(lang)},
            "category": "G-code" if entry["code"].startswith("G") else "M-code",
            "source_section": (
                "13. G code functions" if entry["code"].startswith("G") else "14. M code functions"
            ),
            "source_document": self.reference.get("source_document"),
        }

    # ------------------------------------------------------ program parsing
    _TOKEN_RE = re.compile(r"\b([GM]\d+(?:\.\d+)?[A-Za-z]?)\b")

    def _parse_lines(self, gcode: str) -> List[Dict[str, Any]]:
        parsed: List[Dict[str, Any]] = []
        for number, raw in enumerate(gcode.splitlines(), 1):
            line = raw.strip()
            if not line or line.startswith(("(", ";", "%", "#")):
                continue
            body = line.split("(")[0].split(";")[0]
            tokens = self._TOKEN_RE.findall(body.upper())
            parsed.append({"line": number, "raw": line, "tokens": tokens})
        return parsed

    def explain_program(self, gcode: str, language: str = FALLBACK_LANGUAGE) -> Dict[str, Any]:
        lines: List[Dict[str, Any]] = []
        unknown: List[str] = []
        for item in self._parse_lines(gcode):
            explained = [self.explain_command(tok, language) for tok in item["tokens"]]
            lines.append({"line": item["line"], "raw": item["raw"], "commands": explained})
            for exp in explained:
                if not exp["known"]:
                    unknown.append(exp["code"])
        return {
            "machine_id": self.machine_id,
            "language": language,
            "lines": lines,
            "unknown_commands": sorted(set(unknown)),
            "source_document": self.reference.get("source_document"),
            "advisory_only": True,
        }

    # ---------------------------------------------------- advisory checks
    def validate_program(self, gcode: str) -> Dict[str, Any]:
        """Advisory syntax/consistency checks. NOT real machine validation."""
        parsed = self._parse_lines(gcode)
        findings: List[Dict[str, Any]] = []
        seen: set = set()
        for item in parsed:
            for token in item["tokens"]:
                seen.add(token)
                if token not in self.commands:
                    findings.append({
                        "severity": "warning",
                        "line": item["line"],
                        "message": (
                            f"{token} is not in the AIM-7510 manual G/M-code tables "
                            "— verify against the controller manual."
                        ),
                    })

        if "G70" not in seen and "G71" not in seen:
            findings.append({
                "severity": "info",
                "line": None,
                "message": "No units command detected — add G71 for millimetre programming (G70 is inch).",
            })
        if "G90" not in seen and "G91" not in seen:
            findings.append({
                "severity": "info",
                "line": None,
                "message": "No positioning mode detected — declare G90 (absolute) or G91 (relative).",
            })
        has_g01 = "G01" in seen
        has_feed = any(re.search(r"\bF\d", item["raw"].upper()) for item in parsed)
        if has_g01 and not has_feed:
            findings.append({
                "severity": "warning",
                "line": None,
                "message": "G01 cutting moves present but no F (feed) value detected.",
            })
        if not ({"M30", "M99", "M02"} & seen):
            findings.append({
                "severity": "info",
                "line": None,
                "message": "No program end command (M30) detected.",
            })
        if "M3" in seen and "M5" not in seen:
            findings.append({
                "severity": "info",
                "line": None,
                "message": "Spindle start (M3) present without a spindle stop (M5).",
            })

        # Spindle (S) and feed (F) against the real AIM-7510 limits.
        spindle_limit = self.spindle_rpm_limit()
        feed_limits = self.feed_mm_min_limits()
        global_feed_limit = max((v for v in feed_limits.values() if v is not None), default=None)

        for item in parsed:
            upper = item["raw"].upper()
            if spindle_limit is not None:
                for raw_s in re.findall(r"\bS\s?(\d+(?:\.\d+)?)\b", upper):
                    s_val = float(raw_s)
                    if s_val > spindle_limit:
                        findings.append({
                            "severity": "error",
                            "line": item["line"],
                            "message": (
                                f"Spindle speed S{raw_s} exceeds the AIM-7510 max of "
                                f"{spindle_limit:g} RPM."
                            ),
                        })
            if global_feed_limit is not None:
                for raw_f in re.findall(r"\bF\s?(\d+(?:\.\d+)?)\b", upper):
                    f_val = float(raw_f)
                    if f_val > global_feed_limit:
                        findings.append({
                            "severity": "error",
                            "line": item["line"],
                            "message": (
                                f"Feed F{raw_f} mm/min exceeds the axis-speed ceiling "
                                f"of {global_feed_limit:g} mm/min (X-axis)."
                            ),
                        })

        return {
            "machine_id": self.machine_id,
            "findings": findings,
            "known_limits": self.known_limits,
            "unverified_limits": self.unverified_limits,
            "limits_note": (
                "Spindle (S) is checked against the 20,000 RPM max and feed (F) "
                "against the axis-speed ceiling (X 71 m/min). These are machine axis "
                "limits, not recommended cutting values — confirm feeds/speeds with "
                "your tooling and the operator manual before use."
            ),
            "advisory_only": True,
            "source_document": self.reference.get("source_document"),
        }

    # ------------------------------------------------------- sample program
    def sample_program(self, operation: str = "drill", material: str = "aluminum") -> Dict[str, Any]:
        header = [
            "(AIM-7510 ADVISORY SAMPLE — NOT FOR MACHINE EXECUTION)",
            "(Feeds/speeds are examples within the manual's limits; verify with tooling.)",
            "(Verify every value against the operator manual before use.)",
        ]
        common_start = [
            "G71        (units in millimetres)",
            "G90        (absolute coordinates)",
            "G54        (zero point offset 1)",
            "M3 S12000  (spindle forward — 12000 RPM, within 20000 max)",
            "M8         (cutting cooling on)",
            "G00 X0 Y0 Z10    (rapid to safe clearance)",
        ]
        common_end = [
            "G00 Z10         (retract)",
            "M5         (spindle stop)",
            "M9         (cutting cooling off)",
            "M30        (program end)",
        ]

        if operation == "drill":
            moves = [
                "G00 X40 Y0       (position drill point)",
                "G01 Z-8 F150     (drill — EXAMPLE feed, verify)",
            ]
        elif operation == "mill":
            moves = [
                "G01 Z-2 F300     (engage — EXAMPLE feed, verify)",
                "G01 X80 F600     (milling pass — EXAMPLE feed, verify)",
                "G01 Y40 F600     (milling pass)",
                "G01 X0 F600      (milling pass)",
            ]
        else:  # cut — profile end cut example
            moves = [
                "G01 X-10 F400    (approach profile — EXAMPLE feed, verify)",
                "G01 X80 F600     (profile cut — EXAMPLE feed, verify)",
            ]

        program = "\n".join(header) + "\n" + "\n".join(common_start + moves + common_end)
        return {
            "machine_id": self.machine_id,
            "operation": operation,
            "material": material,
            "program": program,
            "notes": [
                "This machine uses G70 (inch) / G71 (mm) for units — G21 is Y-axis mirroring.",
                "The manual lists no generic G81 drilling cycle and no generic M6 tool change; magazine motion uses M106/M107.",
                "Spindle max 20,000 RPM; axis speeds X 71 / Y 60 / Z 18 m/min. The example S/F values stay within these limits — confirm with your tooling.",
            ],
            "advisory_only": True,
            "source_document": self.reference.get("source_document"),
        }


# Backward-compatible names kept in case other modules import the old classes.
class YDTGCodeEnhancer(GCodeKnowledge):
    """Deprecated alias — use GCodeKnowledge."""


class GCodeYDTValidator:
    """Deprecated alias — wraps GCodeKnowledge.validate_program."""

    def __init__(self, knowledge: GCodeKnowledge):
        self.knowledge = knowledge

    def validate_gcode_program(self, gcode: str) -> Dict[str, Any]:
        return self.knowledge.validate_program(gcode)
