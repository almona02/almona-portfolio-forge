# Follow-up O-JC-2 — `create_follow_up` closure clearing

**Status:** Recorded observation only · **no fix authorized** · code-verified, **not** live-demoed on this fixture  
**Source:** Spark journey-close verdict `JC-PASS-BOUNDED`  
**Related acceptance:** [`JOURNEY_CLOSE_STAGING_ACCEPTANCE.md`](./JOURNEY_CLOSE_STAGING_ACCEPTANCE.md)

---

## Correction

The live journey-close disposition was **`accept_refusal_and_proceed`**. The follow-up job was created through governed actions. This follow-up is **not** a description of the tested disposition.

---

## Observation

Code reading indicates that disposition `create_follow_up` with a standing refusal emits `acknowledgment_refusal_follow_up_required`. That closure block clears only by:

1. a later re-acknowledgment, or  
2. a later disposition of `accept_refusal_and_proceed`.

That reads as intended two-stage gating; **confirm intended behavior** before any change.

---

## Clarify intended behavior (questions only)

- Is `create_follow_up` meant to keep closure blocked until the refusal is re-settled (re-ack or accept-refusal), independent of whether a follow-up job exists?
- Should creating the follow-up job via governed RPCs (without this disposition) ever interact with the acknowledgment prerequisite set?
- Should product docs state that `create_follow_up` and governed job create are orthogonal?

---

## Out of scope for this follow-up

- Implementing code, migrations, UI, or tests  
- Re-running a live `create_follow_up` demo unless separately authorized  
