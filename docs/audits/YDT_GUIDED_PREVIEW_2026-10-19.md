# YDT guided experience — preview verification

Branch: `feature/ydt-industry40-gcode-alarms`; existing PR: [#107](https://github.com/almona02/almona-portfolio-forge/pull/107). Starting revision: `580e9b97`. No merge or production deployment performed.

## Result

The operation, fault and applications quick actions now use an additive, versioned `visual_elements.guided_content` payload. The existing v2 API serializer already carries this field; text-only clients retain a readable fallback. The browser validates the payload and renders it in a dedicated full-width workspace above the conversation. Invalid structured content falls back to text.

- Operation: four topics / eight screens, topic navigation, previous/next, explicit reviewed progress, restart, a final knowledge check and contextual question entry. Viewing the last screen does not complete a guide; all screens must be acknowledged and the checkpoint answered correctly.
- Faults: collect an actual symptom, optional alarm and last operation before sending. The resulting three-screen review preserves those observations. Alarm codes still use the existing alarm-reference response rather than an invented diagnosis.
- Applications: three screens covering profile machining, tooling/programming and the machine's place in a production line. It does not imply welding or corner-cleaning capability.
- Operation and application follow-ups can focus on the requested screen title; the full lesson remains intact for subsequent requests.
- Guide content and new controls support English, Arabic, Turkish and Russian. Arabic guides set RTL direction and reverse navigation arrows.

These are self-paced editorial learning outlines with manual reading references, not an adaptive AI curriculum, a confirmed diagnosis or operator certification. Unsupported numeric setup instructions in the unfinished tutorial were replaced with installed-machine/manual verification tasks. References were checked against the packaged manual's sections 3–5, 10–11 and its troubleshooting index; they do not claim verbatim translation. Progress is held in the open guide's React state and is not persisted across reloads or reopening.

## Verification

| Check | Result |
|---|---|
| Shipped v2 router, actual packaged engine | 10 Python contract tests pass, including all three guide kinds in all four languages, localized application prompts, focused follow-up isolation and alarm-reference preservation |
| Guide and intake UI | 4 Vitest tests pass: completion boundaries/restart, Arabic direction/topic question, malformed payload fallback, actual symptom intake |
| Existing local connectivity suite | 5 tests pass; this earlier untracked test file is not part of this patch |
| Changed frontend lint | Pass, zero errors |
| Type baseline-delta gate | Pass, 1680 current app errors against 1791 baseline; no new signatures. This is not a type-clean result |
| Production build | Pass; existing large-chunk, node:crypto browser externalization and manualChunks warnings remain |
| Whitespace check | Pass |
| Browser: English operation | Actual local API round-trip; all eight screens reviewed, final knowledge check required, completion shown only afterward |
| Browser: English fault intake | Required symptom prevents empty submission; observation and last operation reach the three-screen guide |
| Browser: Arabic applications | Translated quick action returns a three-screen Arabic guide, localized controls, RTL layout and manual reading reference |

Browser preview used a production-mode frontend build configured with `VITE_YDT_API_URL=http://127.0.0.1:8017`, served at `http://127.0.0.1:4018/prestige-agent`. The localhost API mounted the actual `python_backend/apis/v2/prestige.py` router with its packaged engine and a restricted local CORS allowlist, without importing unrelated database/business services. No mocked guide response or production write was used. The regular build was also checked separately.

The development-server page stalled during module loading. A production-build preview succeeded. Switching build outputs on an existing origin also produced a stale-asset error, so the verified run used a clean local origin. Neither failed attempt is counted as a passed browser check.

## Release boundary

Frontend and backend changes must be previewed together. A Vercel preview using the unchanged production API will continue to receive the old text-only responses; it is not evidence for this guide contract. An independently configured backend preview or the verified local pair is required before acceptance. This patch does not deploy the backend or change production configuration.

The new knowledge check establishes only recognition that this guide does not authorize operation/repair. It is not a technical competency assessment. Workshop procedure validation and a broader operator usability study remain separate acceptance work.

Screenshots are stored locally under `.tmp-pr-assess/ydt-preview/`: `operation.png`, `fault.png`, `applications-ar.png`.
