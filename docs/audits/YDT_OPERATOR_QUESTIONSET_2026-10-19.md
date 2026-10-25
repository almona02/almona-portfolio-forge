# YDT Operator Question Set — Source Support & Correctness

Machine: AIM-7510 · 12 questions · 2026-10-19 · graded on **source support and factual correctness** (not model confidence).

## Summary: 8 PASS / 0 PARTIAL / 4 FAIL

| # | Question | Lang | Persona | Verdict | Correct | Source |
|---|---|---|---|---|---|---|
| 1 | What is G71? | en | code_master | PASS | 1.0 | ✅ |
| 2 | What does G21 do? | en | code_master | PASS | 1.0 | ✅ |
| 3 | `G71 G90 M3 G01 X50 F500 M5 M30` (explain) | en | code_master | PASS | 1.0 | ✅ |
| 4 | Validate `S25000` | en | code_master | PASS | 1.0 | ✅ |
| 5 | Validate `F80000` | en | code_master | PASS | 1.0 | ✅ |
| 6 | What is G81? (not in manual) | en | code_master | PASS | 1.0 | ✅ |
| 7 | ما هو G71؟ | ar | code_master | PASS | 1.0 | ✅ |
| 8 | G71 nedir? | tr | code_master | PASS | 1.0 | ✅ |
| 9 | What does alarm 0xA00C mean? | en | doctor | FAIL | 0.0 | ❌ |
| 10 | The spindle is not rotating | en | doctor | FAIL | — | ❌ |
| 11 | ماذا يعني خطأ 0xA00C؟ | ar | doctor | FAIL | 0.0 | ⚠️ |
| 12 | كيف أشغل الآلة؟ | ar | professor | FAIL | 0.0 | ⚠️ |

`Correct` = fraction of expected facts found (0.0 when wrong advice present). `Source` = ✅ cites a manual/document, ⚠️ cites a manual but generic content, ❌ no real source.

## Findings (gaps to fix, in priority order)

1. **Alarm codes are not indexed** (Q9, Q11). The manual's alarm list (`0xA00C` = "Feed Rate Is Not Defined", etc., ch. 18) is not in the engine's searchable knowledge — alarm-code queries return generic responses. *Fix: extract the alarm list into a structured index and route alarm queries to it.*
2. **Fault-symptom routing is too narrow** (Q10). "The spindle is not rotating" (no `fault`/`error` keyword) falls to the generic response. *Fix: broaden diagnosis intent patterns (alarm, 0x…, not rotating, won't start, stopped, fails).*
3. **Wrong supply voltage in the Arabic tutorial** (Q12). The operation guide states **380V 3P**, but the manual (sec. 4) states **400V 3P 50/60Hz**. 380V is the common local grid nominal in Egypt/Turkey, so confirm the intended value before editing — but the answer must not contradict the manual.

## Confirmed strong (post G-code work)

- G-code explanation/validation (EN/AR/TR) is source-cited and machine-specific: `G71`=mm, `G21`=Y-axis mirroring, `G81` honestly "not in the manual tables".
- Over-speed `S` and `F` are now caught against the real 20,000 RPM / 71 m/min limits.

## Artifacts

- `ai_agents/ydt_agent/operator_question_set.json` — the 12-question set.
- `ai_agents/ydt_agent/run_operator_questions.py` — deterministic grader (source support + correctness).
