# Machine Identity Specification

**Status:** Ready for review — **not yet implementation approval.** Design only. No code or schema changes are authorized by this document.
**Version:** 0.2 (review draft)
**Scope decision:** All machine lines (CNC, UPVC, conventional/manual machines, and future lines) share one identity model. Within that scope, conventional/manual-machine workflows are prioritized first (Section 1.5).
**Legacy decision:** Existing machines and serials are grandfathered and remain usable. Passport and QR backfill happens on the next service touch, not by forced re-registration, and ambiguous legacy records are never auto-linked (Section 10).
**Related:** [AICS-001](AICS-001_ALMONA_INDUSTRIAL_COMPUTING_SPECIFICATION.md) · [Institutional overview](INSTITUTIONAL_OVERVIEW.md) · [Project layout](PROJECT_LAYOUT.md)

This specification defines how ALMONA identifies a physical machine from registration through transfers, service, and retirement. It is the contract a future implementation must satisfy. Where current code differs, this document describes the target behavior and names the gap; it does not change current behavior by itself.

### Review decisions confirmed in v0.2

The following decisions are recorded as confirmed for review. They constrain any later implementation proposal:

1. **Scope retained, priority narrowed.** "All machine lines" is retained. Design and any phased rollout prioritize conventional/manual-machine workflows — typed serial, plate photo, technician-assisted registration, and paper-supported service — over connected-CNC automation. No identity workflow may assume connectivity, an HMI, telemetry, or a manufacturer API.
2. **`ALM-` is internal only.** An `ALM-` value is an internal provisional asset reference for support and record-keeping. It is never a manufacturer serial, never stored or displayed in a manufacturer-serial field, and never submitted where a manufacturer serial is expected (validation, warranty, parts-manufacturer checks).
3. **Backfill is conservative.** Legacy records stay usable exactly as they are until enriched. Automatic linking is allowed only for a unique, exact, non-conflicting match. Every ambiguous candidate goes to human review and stays unlinked until decided; an unlinked record is preferable to a wrongly linked one.
4. **Scanning is not authorization.** Identity QR resolution enforces authentication and per-machine authorization on the server before returning anything beyond the minimal public confirmation. A scan alone never exposes ownership, site, documents, or service history — including to a signed-in user who is not authorized for that machine.
5. **Unavailable-owner transfers use a formal exception.** Bilateral confirmation remains the default for ownership transfer. When the previous owner is genuinely unavailable, transfer may complete only through the evidenced, dual-approved exception process in Section 6.4 — never by a single support action or by expiry alone.

**Next milestone (gate to implementation approval):** close the two open authentication/permission follow-ups in Section 14, then review the machine-identity implementation proposal against this specification. Until that review is recorded, this document does not approve implementation.

Normative words follow RFC 2119 usage: **MUST** is required, **SHOULD** is a strong default, **MAY** is optional.

---

## 1. Purpose, scope, and principles

### 1.1 Purpose

Give every physical machine one stable, auditable identity that:

- survives resale, relocation, rebranding of the owning business, and software migrations;
- links the physical plate, the digital record, service history, and spare-parts compatibility;
- lets a technician, owner, or support agent reach the right record from a QR scan or a typed serial without exposing private data.

### 1.2 In scope

- Registration fields and validation (Section 3).
- Missing, illegible, and duplicate serial handling (Section 4).
- Customer (ownership) and site (location) transfers (Section 6).
- Machine passport contents, ownership, and visibility (Section 7).
- QR encoding, scanning, revocation, and replacement (Section 8).
- Legacy grandfathering and backfill (Section 10).

### 1.3 Out of scope

- Database schema, API endpoints, and UI implementation. Those follow in a separate, reviewed change.
- Pricing, warranty commercial terms, and contract wording. This document records warranty *facts* (dates, status source) but does not define commercial policy.
- CNC program execution, safety envelopes, and machine connectivity. Those remain governed by AICS-001 and the machine-connectors layer.

### 1.4 Principles

1. **Identity is the machine, not the paperwork.** The internal `machine_id` identifies the physical unit. Serial numbers, QR codes, passports, and digital-twin codes are *bindings* to that identity and can be corrected, replaced, or revoked without creating a new machine.
2. **Never silently merge or overwrite.** A duplicate or conflicting registration creates a reviewable case, never an automatic merge.
3. **History is append-only.** Corrections add a superseding entry with a reason. No transfer, edit, or backfill deletes prior ownership, site, or service history.
4. **Least disclosure by default.** A public QR scan reveals the minimum needed to confirm "this is a genuine registered machine and here is how to get help." Ownership and service detail require authentication and authorization.
5. **Degrade honestly.** A machine with a missing or unverified serial stays usable for service intake, but its record is visibly marked provisional and its limitations are shown, not hidden.
6. **Manual first.** Every identity workflow must be completable for a conventional/manual machine with no network, no HMI, and no manufacturer API — by typed entry, plate photo, and a technician if needed. Connected-machine automation is an accelerator, never a prerequisite.

### 1.5 Scope and priority

Scope is **all machine lines**: one identity model, one passport, and one transfer and QR contract serve CNC, UPVC, conventional/manual, and future machines. Line-specific technical data stays in the machine profile and does not fork identity.

Within that scope, priority is explicit:

- **Prioritized first:** conventional/manual workflows — manual serial entry and correction, plate-photo evidence, provisional registration, technician-assisted registration at service intake, ownership/site transfer on documentary evidence, and Identity QR as a convenience with a typed-serial fallback at every step.
- **Deferred, not excluded:** connected-CNC automation such as pre-filled registration from a machine handshake, telemetry-linked passport entries, and manufacturer-API-driven verification. These may enrich a passport later but MUST NOT be required to register, transfer, backfill, or service any machine.
- Any proposal that only works for connected machines, or that makes the manual path a degraded afterthought, does not satisfy this specification.

---

## 2. Terminology and identity model

| Term | Meaning |
| --- | --- |
| Machine | One physical unit (one frame / one manufacturer serial plate). A production line of several units is several machines. |
| `machine_id` | Immutable internal identifier (UUID) assigned at first registration. Primary key for all internal references. Never printed as the sole on-plate identifier and never reused after retirement. |
| Manufacturer serial | The serial stamped or labeled by the manufacturer (for example Yilmaz). An external identifier, not a primary key. Stored in two forms defined in Section 4.1. |
| Provisional asset reference (`ALM-`) | Internal ALMONA-issued reference for a machine with no readable manufacturer serial, prefixed `ALM-`. It is an internal support and record-keeping key only: never a manufacturer serial, never displayed or stored as one, and never submitted to manufacturer validation, warranty, or manufacturer parts checks. To an owner it is described as "ALMONA provisional asset reference," with the manufacturer serial shown as "not recorded." |
| Passport | The longitudinal digital record bound to a `machine_id` (Section 7). One machine has exactly one passport; the passport survives transfers. |
| Identity QR | The durable on-plate QR that resolves to the machine (Section 8.1). |
| Event QR | A short-lived, single-use signed QR used to authorize a capture or service event (Section 8.2). This is the existing RealityOS pattern and is a different artifact from the Identity QR. |
| Customer | The owning organization or person recorded as owner. Distinct from the operator and from the site contact. |
| Site | The physical location where the machine is installed and operated. A machine has one current site and a history of past sites. |
| Provisional record | A registration accepted without a verified serial. Fully usable for intake, visibly flagged, with the restrictions in Section 4.2. |

Identity bindings, in order of authority for "is this that machine":

1. `machine_id` (system of record, internal only).
2. Verified manufacturer serial + brand (strongest human-usable binding).
3. Identity QR `qr_id` (resolves to `machine_id`; proves the plate, not ownership).
4. Provisional asset reference (`ALM-`, internal only; never a manufacturer-serial substitute).
5. Model + photos + site (corroborating evidence, never sufficient alone).

A digital-twin code, where issued, is a derived view identifier. It MUST resolve to the same `machine_id` and MUST NOT become a second identity.

---

## 3. Registration fields

Registration creates the `machine_id`, the initial passport, and the first ownership and site entries in one transaction. Fields below reconcile the current surfaces — the web registration flow (serial, catalog model, installation date, photos), the CNC profile API (brand, model, technical limits), and the Yilmaz integration (serial validation, production date, warranty expiry) — into one contract for all machine lines. Line-specific technical fields (travel limits, spindle, controller, and similar) live in the machine profile, not in identity, and are governed by the profile specification.

### 3.1 Field dictionary

Requirement levels: **R** = required to complete registration, **P** = required but may be completed provisionally (Section 4.2), **O** = optional, **C** = conditional (required when its condition holds).

| # | Field | Level | Validation and notes |
| --- | --- | --- | --- |
| 1 | Manufacturer serial (display form) | P | Exactly as printed on the plate, whitespace trimmed. Required unless the missing-serial path in Section 4.2 is taken. |
| 2 | Manufacturer serial (canonical form) | P | System-derived from field 1 by Section 4.1. Never hand-edited. |
| 3 | Brand / manufacturer | R | From the controlled brand list (current values include yilmaz, elumatec, fomm, emmegi, biesse, custom). New brands are added by configuration, not free text. |
| 4 | Model | R | MUST be selected from the product catalog, as the current web flow already enforces. Free-text model entry is not accepted because spare-parts and passport data key off the catalog model. |
| 5 | Machine line / category | R | Derived from the catalog model (for example CNC machining, cutting, UPVC welding). Operator may correct a wrong derivation with a reason; the correction is audited. |
| 6 | Manufacturing / production date | O | From manufacturer validation or documents. Stored as a date; year-only precision is allowed and marked as approximate. |
| 7 | Installation / commissioning date | R | Cannot be in the future. Drives the standard-warranty indicator. If unknown for a legacy machine, use the legacy path in Section 10 instead of inventing a date. |
| 8 | Owner (customer) reference | R | Reference to an existing customer account or organization. Registration MUST NOT create a duplicate customer silently; name collisions prompt the operator to pick the existing record or explicitly create a new one. |
| 9 | Site name and address | R | Site where the machine is installed at registration. Structured enough to distinguish two sites of one customer (city and site label at minimum). Free-text-only site names are accepted for legacy backfill and flagged for cleanup. |
| 10 | Site contact (name, phone or email) | O | Operational contact at the site. Not a substitute for the owner contact. |
| 11 | Registration source | R | One of: `qr_scan`, `manual_serial`, `dealer_import`, `service_intake`, `legacy_backfill`, `admin_entry`. System-set, not operator-editable. |
| 12 | Serial evidence photo | C | Photo of the serial plate. Required when the serial was typed manually and no manufacturer validation succeeded. Optional for validated QR registrations. |
| 13 | Machine photos | O | General photos. Helpful corroboration for duplicate resolution; never identity proof alone. |
| 14 | Dealer / sold-by reference | O | Selling dealer or sales channel, where known. Supports the transfer chain in Section 6. |
| 15 | Purchase / invoice reference | O | Customer-held reference only. The system stores the reference string, not financial documents, by default. |
| 16 | Warranty facts | O | Manufacturer warranty status and expiry as returned by manufacturer validation, plus the installation-derived standard indicator. Each value records its source and as-of date because the two can disagree. |
| 17 | Electrical / configuration facts | O | Voltage, phase, and frequency where the plate states them (the manufacturer service guidance asks for these at intake). Passport-visible, identity-neutral. |
| 18 | Notes | O | Free text. MUST NOT be used to store credentials, personal documents, or payment data. |

### 3.2 Registration rules

- **R1 — One transaction.** Identity, passport shell, initial owner, and initial site are created together or not at all. A failed registration leaves no orphan passport.
- **R2 — Catalog-bound model.** If the model is not in the catalog, registration pauses and routes to catalog review. The operator workaround of typing a near-match is prohibited because it corrupts parts compatibility.
- **R3 — Duplicate pre-check.** Before creation, the system checks canonical serial + brand (Section 4.3) and warns on fuzzy matches (same canonical serial under a different brand, or same model + site + similar serial). The operator sees the warning before, not after, saving.
- **R4 — Actor and audit.** Every registration records who registered the machine, when, from which source, and with what evidence. Edits to fields 1–9 after registration require a reason and are passport events (Section 7.3).
- **R5 — No identity reuse.** A retired or scrapped machine keeps its `machine_id` forever. Its serial MUST NOT be reassigned to a different physical unit in the system; a manufacturer reusing a serial is handled as a duplicate case (Section 4.3), not a reassignment.

### 3.3 Current-state gaps this section closes

Stated for the future implementation, not fixed here: the CNC profile API currently treats `serial_number` as optional free text with no uniqueness or duplicate handling, and the two registration paths (web flow and Yilmaz integration) write different field sets to different tables. Unifying them under this dictionary is implementation work that requires its own review and migration plan.

---

## 4. Serial handling: normalization, missing, and duplicate

### 4.1 Normalization

Two forms are stored:

- **Display form** — as printed, trimmed of surrounding whitespace. Shown to humans everywhere.
- **Canonical form** — derived for matching only: uppercase, all whitespace and separators (`-`, `/`, spaces) removed, leading zeros preserved (they are significant on some plates). Example: display `YM-5K-238492` and `ym 5k 238492` share one canonical form.

Matching, duplicate checks, and manufacturer validation MUST use the canonical form plus brand. Display forms are never compared directly. Canonicalization rules are versioned; changing them requires re-checking the existing fleet for newly colliding serials before the new rules take effect.

Manufacturer validation (today: the Yilmaz validate-serial call) is an enrichment, not a gate. Outcomes:

| Validation outcome | Registration effect |
| --- | --- |
| Valid, model returned | Serial marked `verified`. Returned model is compared with the catalog selection; a mismatch pauses registration for operator confirmation. |
| Not found (definitive) | Serial marked `unverified`. Registration may complete with a plate photo (field 12). The passport shows "serial not confirmed by manufacturer." |
| Service unavailable / not configured | Serial marked `unchecked`. Registration proceeds as unverified without blaming the operator. Retry happens at the next service touch. |

### 4.2 Missing or illegible serial

A machine whose plate is missing, damaged, or illegible MUST still be registrable. Blocking registration would block service, which is the worse outcome.

- The record is created as **provisional** and issued an internal provisional asset reference (`ALM-` plus a unique suffix). The manufacturer serial fields stay empty — placeholder text such as "UNKNOWN" or "N/A" MUST NOT be stored as a serial, and the `ALM-` value MUST NOT be written into a manufacturer-serial field, shown under a "Serial Number" label, printed on a plate as a serial, or sent to a manufacturer system. Where a serial is normally displayed, a provisional machine shows "Manufacturer serial: not recorded" and, to authorized staff only, the `ALM-` reference under its own label.
- Provisional registration requires: brand and model (fields 3–4), a plate-area photo showing the missing or damaged plate, and a reason code (`plate_missing`, `plate_damaged`, `plate_illegible`, `plate_inaccessible`).
- Capabilities while provisional: service tickets, maintenance scheduling, and passport history work normally under the `machine_id`, citing the `ALM-` reference internally. Manufacturer warranty claims and manufacturer validation are unavailable. Parts ordering works but shows an unverified-identity caution.
- Resolution: when a serial is later recovered (plate replaced by the manufacturer, documents found), an authorized user attaches it with evidence. The record leaves provisional status, the `ALM-` reference is retained as an internal historical alias (never promoted to a serial), and the event is written to the passport. Provisional records SHOULD be reviewed in a periodic queue until resolved; they never expire silently.
- A provisional record MUST NOT be auto-matched to an existing serial record. Human confirmation with evidence is required (Section 4.3).

### 4.3 Duplicate serial

Uniqueness rule: at most one non-retired machine record may hold a given (brand, canonical serial) pair as its verified serial. Retired records keep their serial historically and do not block a case review, but they do trigger one.

On a duplicate attempt, registration MUST stop with a duplicate case — never overwrite, never create a second record silently, and never reveal the existing owner's private details to the registrant. The operator sees only: that the serial is already registered, the model, the registration year, and the route to resolve.

Resolution outcomes, all audited:

| Case | Resolution |
| --- | --- |
| Same physical machine, re-registration attempt (for example after resale without transfer, or a second employee registering again) | Do not create a record. Route to the transfer flow (Section 6) or to "request access from current owner." |
| Typing error in either record | Correct the wrong record with evidence and a reason. The corrected canonical form is re-checked for collisions. |
| Two genuinely different physical units sharing a serial (manufacturer reuse or plate error) | Both records stay. Each is marked `serial_disputed`. The unit with plate evidence keeps `verified`; the other drops to `unverified` until the manufacturer confirms. Support is notified; neither passport merges. |
| Fraudulent claim suspected (no plate evidence, conflicting site) | Duplicate case is escalated to support. The existing record is untouched. The new attempt stays provisional and flagged until a human decides. |

Merging two records that turn out to be one machine is an admin-only, reversible operation: the surviving record keeps the earlier `machine_id`, the merged-away id remains as a permanent redirect, and both passports' events are preserved with provenance. Merges are never performed by the duplicate-detection code automatically.

### 4.4 Serial correction

A serial may be corrected when evidence shows the stored value is wrong (mis-keyed, wrong plate photographed). Correction requires the plate photo, a reason, and — for verified serials — an authorized role. The old value is kept in passport history. If the corrected value collides, Section 4.3 applies before the correction is saved.

---

## 5. Identity lifecycle

| State | Meaning | Entry | Exit |
| --- | --- | --- | --- |
| `provisional` | Registered without a verified serial (Section 4.2). | Missing-serial registration. | Serial attached and checked; or retirement. |
| `active` | Normal registered machine (verified, unverified, or unchecked serial). | Completed registration or provisional resolution. | Transfer pending, retirement. |
| `transfer_pending` | An ownership or site transfer awaits confirmation (Section 6). Machine remains fully operable. | Transfer initiated. | Confirmed, rejected, expired, or completed via the Section 6.4 exception. |
| `serial_disputed` | Flag, combinable with `active`, while a duplicate case is open. | Duplicate resolution opens. | Case closed with an outcome in Section 4.3. |
| `retired` | Scrapped, destroyed, or permanently decommissioned. Terminal. | Owner or support attestation with reason. | None. Record and passport remain readable for audit. |

Operational status (idle, running, maintenance, error, offline) is *not* identity state and MUST stay in the machine profile where it lives today. A machine changing operational status never changes identity state.

---

## 6. Customer and site transfers

Ownership and location are independent axes. Selling a machine without moving it, and moving a machine within one company, are different events with different evidence. Both are passport events; neither creates a new machine, a new passport, or a new `machine_id`, and the Identity QR on the plate stays valid across both.

### 6.1 Ownership (customer) transfer

Applies when the owning customer changes: resale, intra-group asset transfer, dealer buy-back, or correction of a wrongly recorded owner.

- **Initiation.** Either the current owner, the receiving customer, a dealer acting for one of them, or support may initiate. The initiator states the receiving customer, the effective date, and the transfer reason.
- **Confirmation.** The transfer completes only after confirmation by the other party: current owner confirms a receiver-initiated transfer and vice versa. The sole alternative is the formal unavailable-owner exception in Section 6.4. No single support action, and no expiry of the confirmation window by itself, completes a transfer.
- **What moves.** The full passport, service history, documents, and open maintenance schedules move with the machine and remain visible to the new owner. Open service tickets stay attached to the machine; the new owner gains visibility, the previous owner retains read access to tickets they raised (Section 9).
- **What does not move.** The previous owner's private data: their other machines, payment methods, unrelated tickets, and contacts. Transfer grants no access beyond this machine.
- **Warranty.** Warranty facts travel with the machine. Whether coverage remains valid after resale is a commercial decision recorded as a warranty note on the passport; the system MUST display the recorded position rather than assuming transferability.
- **Refused or abandoned transfers.** If the other party refuses, or does not respond within the configured window (default 14 days, with reminders), the transfer expires to `active` with the attempt recorded. Repeated failed attempts against the same machine notify support.

### 6.2 Site transfer (relocation)

Applies when the machine moves site under the same owner: factory move, workshop expansion, or correction of the recorded site.

- Site transfer requires only the owner's confirmation (no second party), plus the new site details per field 9 and the effective date. The machine SHOULD NOT be booked for site-dependent service at the old site after the effective date.
- The previous site entry is closed with an end date, never edited away. Site history answers "where was this machine on date X" for any past date.
- A combined move — sold and relocated — is recorded as one ownership transfer and one site transfer sharing an effective date, so each axis stays independently auditable.

### 6.3 Transfer safeguards

- No transfer deletes history, rewrites prior owners or sites, or changes the serial, passport, or QR bindings.
- While `transfer_pending`, a second transfer of the same axis MUST NOT be initiated. Identity corrections (Section 4.4) remain allowed.
- Every initiation, confirmation, refusal, expiry, and support override is a passport event with actor, timestamp, and reason. Notifications go to both parties' registered contacts, never only to the initiator.
- Bulk fleet transfers (a customer selling or moving many machines) follow the same per-machine rules; a batch wrapper MAY collect confirmations but MUST record each machine's event individually so a partial failure never half-transfers the fleet silently.

### 6.4 Exception: previous owner unavailable

Bilateral confirmation fails in legitimate cases: the previous owner has ceased trading, is deceased, has left no reachable contact, or cannot be identified from the record. This exception exists for those cases only. Convenience, an unreturned message, or a buyer in a hurry does not qualify.

Eligibility — at least one must be evidenced, and the evidence is filed on the passport:

- the previous owning business is dissolved or deregistered (registry extract or equivalent);
- the previous owner is deceased and the machine passed by inheritance or estate sale (estate or sale document);
- the registered contacts are demonstrably unreachable after the documented attempt protocol below;
- the machine was acquired through a dealer, auction, or liquidator who cannot produce the previous owner (their sale document substitutes for owner identity, not for transfer evidence).

Process, in order:

1. **Attempt protocol.** At least three contact attempts over at least 30 days, across at least two channels (registered email, phone, dealer of record, postal address where held), each logged with date and outcome. Attempts stop early only on positive evidence of dissolution or death.
2. **Evidence pack.** The requester files: proof of acquisition or possession (invoice, auction or liquidator record, inheritance document), a plate photo of the physical machine, and a signed attestation that they possess the machine and are unaware of any competing claim. No evidence pack, no exception.
3. **Notice hold.** The machine enters `transfer_pending` with reason `owner_unavailable`. Notice is sent to every last-known contact of the previous owner and held for a contest window (default 30 days from the last notice). Any response from the previous owner during the window reverts the case to normal bilateral confirmation.
4. **Dual approval.** Completion requires two authorized approvers who are not the requester and not each other’s direct report for this case: one support lead and one admin (four-eyes rule). Either may refuse; refusal returns the machine to `active` under the recorded owner with the attempt preserved.
5. **Completion and contest.** On approval the transfer completes as a normal Section 6.1 transfer, flagged `via_exception`. If the previous owner later contests with proof of ownership, the case reopens: the machine is flagged, neither party may re-transfer it while contested, and resolution (including reversal) is decided by admin review with both parties’ evidence. The exception trail is never deleted, including after a reversal.

Safeguards: exception transfers are reported in a periodic admin review (count, requesters, approvers). Repeated exception requests by the same requester trigger enhanced scrutiny. Who may act as approver, and any shortening of the windows above, are permission decisions reserved to the Section 14 follow-ups — an implementation proposal MUST NOT invent its own approver list.

---

## 7. Machine passport

The passport is the machine's longitudinal record: its birth certificate, ownership chain, and service book in one place. It is bound to `machine_id`, created empty at registration, and grows by appended events for the machine's whole life, including after retirement (read-only).

### 7.1 Passport contents

| Section | Contents | Source |
| --- | --- | --- |
| Identity header | `machine_id` (internal), display serial — or "not recorded" with the internal `ALM-` reference shown separately to authorized staff — brand, catalog model, machine line, production date, identity state, serial verification status. The `ALM-` value never occupies the serial display. | Registration and Section 4 events. |
| Manufacture and commissioning | Production date and source, dealer / sold-by, installation date, commissioning evidence and photos. | Registration fields 6, 7, 12–14. |
| Ownership chain | Every owner with start and end dates, transfer reason, and confirmation provenance. Current owner marked. | Section 6.1 events. |
| Site history | Every site with start and end dates and site label. Current site marked. | Registration and Section 6.2 events. |
| Warranty record | Manufacturer status and expiry with source and as-of date; installation-derived standard indicator; post-transfer warranty notes; extension facts where recorded. Conflicting values are shown side by side, never silently reconciled. | Fields 7 and 16; manufacturer validation. |
| Service and maintenance history | Service tickets citing this machine, scheduled and completed maintenance, calibration and inspection records, parts fitted (part number, date, ticket reference). Mirrors ticket history; the passport links rather than copies free-text ticket bodies. | Ticket and maintenance systems citing `machine_id` or the verified serial. |
| Configuration snapshot | Current technical profile summary (controller, key limits) and a dated trail of profile changes that affect parts or service. Full profile stays in the profile system. | Machine profile. |
| Documents and evidence | Plate photos, registration photos, transfer documents, certificates. Each with uploader, date, and purpose. | Registration and transfer flows. |
| QR bindings | Current Identity QR id, issue and replacement history, revocation status (Section 8). | QR issuance. |
| Identity events | Registrations, serial attachments and corrections, duplicate cases and outcomes, merges, state changes, retirements — each with actor, timestamp, reason, and evidence reference. | Sections 4–6. |

### 7.2 Passport rules

- **One passport per machine.** Transfer, merge redirect, and retirement never create a second passport. Provisional machines have a passport from day one so service history is never stranded outside it.
- **Append-only.** Events are never edited in place. A wrong event is corrected by a superseding event that references it. Display layers MAY summarize but MUST be able to show the full event trail to authorized roles.
- **Tickets bind by identity, not by typed text.** New tickets SHOULD store `machine_id` alongside the customer-visible serial text. Historical tickets that carry only a typed `machine_serial_number` are linked during backfill (Section 10) by canonical serial match, and ambiguous matches go to human review rather than auto-linking.
- **Derived values show their source.** Warranty indicators, verification badges, and completeness markers always expose "from manufacturer validation on DATE" or "derived from installation date" so a reader can judge trust without guessing.

### 7.3 Passport completeness

The passport shows a completeness indicator (for example: identity verified / evidence attached / ownership current). Completeness is guidance for operators and support, never a gate that blocks service. A sparse legacy passport (Section 10) is displayed honestly as sparse.

---

## 8. QR behavior

Two different QR artifacts exist and MUST NOT be conflated. The durable plate code and the short-lived event code have opposite lifetimes, signatures, and failure modes.

### 8.1 Identity QR (on-plate, durable)

- **Binding.** Each Identity QR carries a unique `qr_id` bound 1-to-1 to a `machine_id` at issuance. The payload encodes only: format version, `qr_id`, and a signature or resolution token sufficient for the resolver to verify the code was ALMONA-issued. It MUST NOT encode owner name, phone, email, address, or any personal data — plates outlive owners.
- **Resolution and permissions.** Scanning resolves `qr_id` to the machine, but resolution is not authorization. The resolver MUST decide access on the server, per machine, before composing any response: (a) an unauthenticated scanner receives only the minimal public confirmation — brand, model, masked serial (for example last 4 characters), registration year, plain-language identity state ("Registered", "Registration provisional", "Retired"), and support entry points; (b) an authenticated user receives passport detail (owner, site, documents, service history) only if they hold a role for that specific machine under Section 9 — signing in alone grants nothing, and an authorized-for-another-machine user sees exactly the public view; (c) owner and service-history data MUST NOT appear in the scan response, page source, cached payload, or follow-on API data for anyone failing (b). The resolver MUST NOT confirm or deny ownership guesses, MUST use unguessable `qr_id` values with scan rate-limiting against enumeration, and MUST log denied elevated-access attempts. Hiding data in the UI while returning it from the resolver is a violation of this section.
- **Lifetime.** The Identity QR has no expiry while the machine is active. It survives transfers unchanged — the new owner scans the same plate. On retirement the resolver shows the retired state instead of erroring.
- **Replacement.** A damaged or lost plate is replaced by issuing a new `qr_id` for the same `machine_id` and revoking the old one. The passport records both ids and the reason. At most one Identity QR per machine is active at a time.
- **Revocation and cloning defense.** A revoked `qr_id` resolves to "this code has been replaced" without exposing the machine record. If two different physical plates present the same `qr_id` (cloned plate), scan telemetry (time, coarse location where consented, account) SHOULD be used by support to investigate; the system MUST NOT auto-reassign identity based on scan location alone. Printed codes SHOULD include the human-readable manufacturer serial beneath the QR (or "ALMONA-registered machine — serial on file with ALMONA support" for a provisional machine, without printing the internal `ALM-` reference as a serial) so a destroyed code does not destroy identifiability.
- **Issuance points.** New machines: at registration. Legacy machines: at backfill (Section 10), physically fitted at the next service visit or mailed as a plate label to the verified owner — never issued to an unverified requester for a machine they cannot evidence access to.

### 8.2 Event QR (short-lived, single-use)

Event QRs authorize one capture or service action (for example a RealityOS-verified service event). They follow the existing frozen pattern and this specification adopts it unchanged:

- Signed payload with format version, `entity_id` (here: the `machine_id`), `vertical_id`, unique `qr_id`, `created_at`, `valid_from`, `valid_to`, and an HMAC-SHA256 signature over the canonical field order `v|entity_id|vertical_id|qr_id|created_at|valid_from|valid_to`.
- Validity window MUST NOT exceed 7 days; single-use enforced against the QR lifecycle record; revocation and supersession are checked at validation time; validation follows the existing five-step process (structure, signature, temporal validity, single-use, entity binding, revocation).
- An Event QR is never printed on the machine plate and never substitutes for the Identity QR. Expired or replayed Event QRs fail closed with a reason the technician can act on ("expired — request a new code").

### 8.3 Scan failure behavior

| Scan result | User sees | System does |
| --- | --- | --- |
| Valid Identity QR | Public confirmation page (Section 8.1). | Logs the scan (time, authenticated account if any). No state change. |
| Revoked / replaced QR | "This label has been replaced" plus how to identify the machine by serial. | Logs; offers serial entry. Does not reveal the record. |
| Unknown `qr_id` / bad signature | "Code not recognized" plus manual serial entry and support contact. | Logs at notice level for clone monitoring. Never creates a record from a scan alone. |
| Retired machine | Confirmation page marked retired, support contact only. | No service booking offered against the retired identity. |
| Expired / replayed Event QR | Actionable error naming expiry or prior use. | Rejects the event; no partial event is recorded. |
| No network (field scan) | Cached public confirmation if previously resolved on that device, clearly marked as offline and dated; otherwise serial entry for later sync. | Queues the scan log. Identity-changing actions (transfer, correction) MUST NOT complete offline. |

Manual entry is the permanent fallback at every failure row: brand + typed serial (canonicalized per Section 4.1), then the missing/duplicate rules decide the outcome.

---

## 9. Roles, visibility, and privacy

| Audience | Sees | May do |
| --- | --- | --- |
| Public (QR scan, signed out) | Brand, model, masked serial, registration year, plain-language identity state, support contacts. | Request support contact. Nothing else. |
| Current owner | Full passport for their machines, ownership and site history, documents they are party to. | Register, initiate or confirm transfers, correct site details, request QR replacement, retire with attestation. |
| Previous owner | Their own historical tickets and the fact of transfer (date and that it completed). Not the new owner's identity or later history. | Raise historical queries with support. |
| Dealer | Machines they sold or transferred, limited to the transaction and commissioning sections. | Initiate transfers on a party's behalf, upload commissioning evidence. |
| Technician / support | Full passport including evidence, duplicate cases, and scan logs, scoped to their assignment or support role. | Attach recovered serials, resolve duplicate cases per Section 4.3, issue replacement QRs, complete evidenced support transfers. |
| Admin | All of the above plus merges, canonicalization changes, and audit export. | Merge records (reversible, Section 4.3), manage brand list, export audit trail. |

Privacy rules: personal data (names, phones, emails, exact addresses) never appears in QR payloads, public pages, or duplicate-case notices. Scan logs and transfer notifications are retained per the project's audit policy and are visible to support and admin only. Owner data handling on transfer follows Section 6.1; a new owner never inherits the previous owner's contacts or payment data.

## 10. Legacy machines: grandfathering and backfill

Existing machines keep working exactly as today. Nothing in this specification requires re-registration, blocks service, or invalidates an existing serial.

- **Grandfathering and usability.** Every existing machine record keeps its identity, its existing identifiers, and its history, and remains fully usable for tickets, parts, and service before, during, and after backfill. Backfill only enriches a record: it MUST NOT change the record's owner, invalidate its serial, downgrade its state, or require any field to be completed before service continues. Records missing fields required by Section 3 are marked with the specific gaps (for example "installation date unknown") instead of being filled with invented values.
- **Backfill trigger.** Backfill happens opportunistically at the next service touch — ticket, maintenance visit, parts order, or owner sign-in review — whichever comes first. Backfill is a guided completion of missing passport fields with evidence, performed by the owner or technician present with the machine. A declined or interrupted backfill leaves the legacy record exactly as usable as before the attempt.
- **Backfill order.** (1) Confirm or attach the serial with a plate photo; run the duplicate check because legacy duplicates are expected and resolved per Section 4.3 without penalizing either owner. (2) Confirm owner and current site. (3) Issue the Identity QR. (4) Link historical tickets only under the linking rules below.
- **Linking rules (no ambiguous auto-linking).** A historical ticket, document, or record is auto-linked to a passport only when the canonical serial plus brand matches exactly one machine and no conflicting evidence exists (model, site, and owner, where known, do not contradict the match). The original typed serial text is preserved verbatim alongside the link. In every other case — multiple candidate machines, a partial or separator-variant-only match with conflicting attributes, brand or model disagreement, or a match against a provisional or disputed record — the item is queued for human review and remains unlinked, visibly listed as "awaiting identity review," until a person decides with evidence. Review decisions are passport events. Fuzzy name, address, or model-only similarity MUST NEVER trigger an automatic link, and no batch backfill job may link on a best-guess basis.
- **Legacy duplicates.** Where the legacy fleet already contains two records for one machine (a known consequence of the current duplicate-free-for-all), backfill merges them only through the admin merge in Section 4.3, keeping the earlier `machine_id` and a permanent redirect from the merged one.
- **No service penalty.** A machine that has not yet been backfilled raises tickets and orders parts exactly as today. Its passport shows "legacy record — details to be confirmed at next service," which is information, not a block.
- **Completion measure.** Backfill progress is reported as fleet coverage (percent with verified serial, percent with Identity QR issued). There is no deadline after which un-backfilled machines lose service.

## 11. Errors and operator messaging

Identity failures are routine field conditions, not system errors. Messages name the condition and the next action, in the operator's language (the UI is localized; message keys, not hard-coded strings, are the implementation contract).

| Condition | Message intent | Next action offered |
| --- | --- | --- |
| Serial not found by manufacturer | "We could not confirm this serial with the manufacturer. You can continue — add a photo of the serial plate." | Continue with photo; marked unverified. |
| Manufacturer check unavailable | "The manufacturer check is unavailable right now. You can continue; we will re-check later." | Continue; marked unchecked. |
| Duplicate serial | "This serial is already registered (MODEL, YEAR). If this is your machine, request a transfer instead of registering again." | Transfer / request access / support case. No owner details shown. |
| Missing plate | "No problem — we will register the machine provisionally and use a photo of the plate area. The manufacturer serial will show as 'not recorded'." (The internal `ALM-` reference is not presented to the customer as a serial.) | Provisional path (Section 4.2). |
| Transfer not confirmed | "The other party has not confirmed yet" / on expiry: "The transfer request expired. You can send it again." | Re-send, cancel, or contact support. |
| Replaced QR scanned | "This label was replaced. Use the current label or enter the serial number." | Serial entry; support contact. |

Support-facing error codes (for logs and tickets, distinct from user text) SHOULD distinguish at least: `SERIAL_NOT_CONFIRMED`, `SERIAL_CHECK_UNAVAILABLE`, `SERIAL_DUPLICATE`, `SERIAL_DISPUTED`, `REGISTRATION_PROVISIONAL`, `TRANSFER_AWAITING_CONFIRMATION`, `TRANSFER_EXPIRED`, `QR_REVOKED`, `QR_UNKNOWN`, `QR_EXPIRED`, `QR_REPLAYED`, `MACHINE_RETIRED`.

## 12. Audit and integrity requirements

- Every identity event (registration, serial attach/correct, duplicate case lifecycle, transfer lifecycle, QR issue/revoke, merge, retirement, admin override) is an immutable audit record: actor, role, timestamp, before/after values, reason, and evidence reference where applicable.
- Audit records survive merges and retirements and are exportable by admin for a given `machine_id` as one chronological trail (the passport identity-events view is this trail, filtered by role visibility).
- No identity-changing operation is performed by an unauthenticated or system-anonymous actor. Automated enrichment (manufacturer re-check, ticket linking) is recorded as a system actor with its rule named.

## 13. Acceptance criteria for a future implementation

An implementation of this specification is acceptable only when all of the following are demonstrably true (each is testable without reference to internals):

1. Registering with a catalog model and a manufacturer-confirmed serial yields an `active` record, one passport, and a scannable Identity QR whose public page shows no personal data.
2. Registering with the same canonical serial (different casing or separators, same brand) stops with the duplicate route and creates no second record and no data leak about the existing owner.
3. Registering without a serial completes as provisional with an internal `ALM-` reference (never shown or stored as a manufacturer serial), works for ticket creation, and converts to `active` when a serial with plate evidence is attached — with the provisional period and recovered serial both visible in passport history.
4. An ownership transfer confirmed by both parties moves the passport and open schedules, preserves the full history for the new owner, limits the previous owner to their historical view, and never changes `machine_id`, serial, or the plate QR.
5. A site-only transfer closes the old site with an end date and answers historical "where was it on date X" correctly.
6. A replaced plate QR resolves to the replaced notice while the new QR resolves to the machine; a retired machine's QR shows the retired state; an expired or replayed Event QR fails closed with an actionable message.
7. A legacy machine with missing Section 3 fields receives service with no block, shows its gaps honestly, and backfills (serial evidence → owner/site confirm → QR issue → ticket linking) at the next service touch.
8. Every action in criteria 2–7 appears in the machine's audit trail with actor, timestamp, and reason, and merges (where exercised) redirect the merged `machine_id` permanently.
9. Scanning a valid Identity QR signed-out, and signed-in as a user with no role on that machine, returns the identical minimal public view; owner, site, and service history appear in no response payload until a per-machine authorized role is presented. Guessing or enumerating `qr_id` values yields no machine data.
10. An unavailable-owner transfer completes only after the Section 6.4 attempt log, evidence pack, contest window, and two independent approvals are all on the passport; a single-approver or evidence-free attempt cannot complete, and a later evidenced contest reopens the case without deleting its trail.
11. Backfill auto-links a legacy ticket only on a unique exact serial-plus-brand match with no conflicting evidence; a ticket matching two machines (or one machine ambiguously) stays visibly unlinked in the review queue, and the legacy machine's service usability is unchanged before and after the attempt.

## 14. Open follow-ups and review gate

Implementation approval is blocked until both follow-ups below are closed in writing (decision recorded in this document or a linked review record) and the implementation proposal has been reviewed against this specification. Closing a follow-up means naming the decided rule, not merely acknowledging the question.

| # | Follow-up (authentication / permission) | Must decide | Blocks |
| --- | --- | --- | --- |
| F1 | Identity QR and passport authorization model | The exact per-machine role matrix enforced by the resolver (owner, dealer, technician assignment scope, support, admin); how authorization is checked server-side on every passport-bearing response; session and token expectations for scan-originated access; enumeration and rate-limit thresholds. | Any QR resolver or passport API work. |
| F2 | Transfer-permission model, including the Section 6.4 exception | Who may initiate, confirm, and act as each of the two exception approvers (named roles, independence rule); whether window lengths (14-day confirmation, 30-day attempts, 30-day contest) are fixed or configurable and by whom; notification obligations when no registered contact exists. | Any transfer implementation, especially `owner_unavailable`. |

**Review sequence:** (1) close F1 and F2; (2) review the machine-identity implementation proposal clause-by-clause against Sections 3–13, recording deviations explicitly; (3) record implementation approval (or rejection) with reviewer and date. A proposal that presumes answers to F1 or F2, or that implements before step (3), is out of process regardless of its technical merit.

## Appendix A. Examples (fictional)

- Canonicalization: `YM-5K-238492`, `ym5k238492`, and `YM 5K 238492` (same brand) are one serial. Serial text such as `CNC-2023-001234` on a ticket is matched by the same rule during backfill.
- Resale without transfer: Buyer registers the serial, hits the duplicate route, requests a transfer. Seller confirms. Buyer scans the unchanged plate QR and lands on a passport whose ownership chain now shows both owners with the transfer date.
- Recovered serial: A provisional machine (internal `ALM-` reference, `plate_damaged`) receives a manufacturer replacement plate at a service visit. The technician attaches the new serial with a plate photo; the passport shows the provisional period, the internal alias, and the verified serial from that date forward.






