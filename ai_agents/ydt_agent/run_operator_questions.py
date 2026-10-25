#!/usr/bin/env python3
"""Run the operator question set and grade source support + factual correctness.

Grading is deterministic and transparent:
  * source_supported = 1.0 when the answer cites a real manual/document source
    (anything other than the generic 'general_knowledge').
  * correctness = 0.0 if any forbidden_fact appears (wrong advice); otherwise the
    fraction of expected_facts present in the answer.
  * verdict = PASS (source + all facts), PARTIAL (source + >=50% facts), FAIL.

This records source support and incorrect advice — never model confidence.
"""
import json
import sys
from pathlib import Path

REPO = Path(r"C:\projects\almona-portfolio-forge")
sys.path.insert(0, str(REPO))

from ai_agents.ydt_agent.ydt_chatbot_engine import (  # noqa: E402
    YDTChatbotEngine,
    ChatContext,
    Language,
    Persona,
)

PERSONA = {
    "professor": Persona.PROFESSOR,
    "doctor": Persona.DOCTOR,
    "tour_guide": Persona.TOUR_GUIDE,
    "code_master": Persona.CODE_MASTER,
    "nervous_system": Persona.NERVOUS_SYSTEM,
}
LANG = {
    "en": Language.ENGLISH,
    "tr": Language.TURKISH,
    "ru": Language.RUSSIAN,
    "ar": Language.ARABIC,
}

GENERIC_SOURCE = "general_knowledge"


def grade(engine, q):
    ctx = ChatContext(
        user_id="eval", machine_id="aim-7510",
        language=LANG[q["language"]], persona=PERSONA[q["persona"]],
        conversation_history=[],
    )
    resp = engine.process_query(q["question"], ctx)
    answer = resp.content or ""
    lower = answer.lower()

    matched = [f for f in q["expected_facts"] if f.lower() in lower]
    forbidden_hits = [f for f in q["forbidden_facts"] if f.lower() in lower]

    sources = resp.sources or []
    source_supported = 1.0 if (sources and GENERIC_SOURCE not in sources) else 0.0

    if forbidden_hits:
        correctness = 0.0
    else:
        correctness = len(matched) / len(q["expected_facts"]) if q["expected_facts"] else 1.0

    if source_supported and correctness == 1.0:
        verdict = "PASS"
    elif source_supported and correctness >= 0.5:
        verdict = "PARTIAL"
    else:
        verdict = "FAIL"

    return {
        "id": q["id"],
        "question": q["question"].replace("\n", " ⏎ "),
        "language": q["language"],
        "persona": q["persona"],
        "verdict": verdict,
        "correctness": round(correctness, 2),
        "source_supported": source_supported,
        "matched_facts": matched,
        "missing_facts": [f for f in q["expected_facts"] if f not in matched],
        "forbidden_hits": forbidden_hits,
        "sources": sources,
        "answer_excerpt": answer[:200],
        "note": q.get("note", ""),
    }


def main():
    set_path = Path(sys.argv[1]) if len(sys.argv) > 1 else (
        Path(__file__).resolve().parent / "operator_question_set.json"
    )
    qset = json.loads(set_path.read_text(encoding="utf-8"))
    engine = YDTChatbotEngine(REPO / "ai_agents" / "ydt_agent" / "knowledge")

    results = [grade(engine, q) for q in qset["questions"]]

    # Markdown report
    lines = [
        "# YDT Operator Question Set — Source Support & Correctness",
        "",
        f"Machine: {qset['machine_id']} | {len(results)} questions | graded on source support and factual correctness (not model confidence).",
        "",
        "| # | Question | Lang | Persona | Verdict | Correct | Source | Missing / Forbidden |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for i, r in enumerate(results, 1):
        detail = []
        if r["missing_facts"]:
            detail.append("missing: " + ", ".join(r["missing_facts"]))
        if r["forbidden_hits"]:
            detail.append("WRONG: " + ", ".join(r["forbidden_hits"]))
        lines.append(
            f"| {i} | {r['question'][:60]} | {r['language']} | {r['persona']} "
            f"| {r['verdict']} | {r['correctness']} | {int(r['source_supported'])} "
            f"| {'; '.join(detail) or '—'} |"
        )

    passed = sum(1 for r in results if r["verdict"] == "PASS")
    partial = sum(1 for r in results if r["verdict"] == "PARTIAL")
    failed = sum(1 for r in results if r["verdict"] == "FAIL")
    lines += [
        "",
        f"**Summary: {passed} PASS / {partial} PARTIAL / {failed} FAIL**",
        "",
        "## Findings",
        "",
    ]
    for r in results:
        if r["verdict"] != "PASS":
            lines.append(
                f"- **{r['id']}** ({r['verdict']}): {r['note']} "
                f"→ answer was: \"{r['answer_excerpt'][:120]}\""
            )
    lines.append("")

    report = "\n".join(lines)
    print(report)

    out = set_path.with_name("operator_question_report.json")
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[eval] report -> {out}")


if __name__ == "__main__":
    main()
