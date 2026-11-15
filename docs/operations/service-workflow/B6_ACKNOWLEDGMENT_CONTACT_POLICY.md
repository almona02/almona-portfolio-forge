# B6 — Acknowledgment & contact policy

**Status:** Freeze artifact (disposable/local only; **no staging apply**)  
**Spec:** `docs/service-workflow-spec.md` §§3.5, 7  
**Gates:** #155 frozen · #156 draft · no merge · no production

## Acknowledgment attachment

- An acknowledgment event attaches to the **exact issued revision** it concerns (`issued_revision_id`).
- A newly issued correction does **not** inherit acceptance (or any response) from a prior revision.
- Effective response for a revision = latest acknowledgment by `(responded_at, id)` — append-only; never overwrite.
- Identical repeat (same actor, response, comment, and contact evidence) is **idempotent** (returns the existing effective row).
- A later different response appends history and becomes the new effective response.

## Customer responses

| Response | Who | Requirements |
|----------|-----|--------------|
| `accepted` | Ticket owner (see permission matrix) | Exact issued revision |
| `refused` | Ticket owner | Mandatory non-empty comment |
| `unavailable` | `admin` / `support` only | Attributable contact-attempt evidence (below) |

Never convert `refused` or `unavailable` into `accepted`. Display each response honestly.

## Contact-attempt evidence (`unavailable`)

Staff may record `unavailable` only when the request includes **attributable contact-attempt evidence** under this policy. The database validates **structure and attribution**, not a silent calendar rule.

### Required evidence shape

`contact_attempts` is a JSON array of objects. Each attempt MUST include:

| Field | Rule |
|-------|------|
| `attempted_at` | ISO-8601 timestamptz string |
| `channel` | Non-empty text (e.g. `email`, `phone`, `in_app_notification`, `site_visit`) |
| `outcome` | Non-empty text (e.g. `no_answer`, `left_voicemail`, `bounced`, `acknowledged_later_pending`) |
| `by_actor_id` | UUID of the staff member who performed/logged the attempt (attributable) |

### Minimum for recording `unavailable`

1. At least **one** attempt that records the **issue-time customer notification** (channel may be `in_app_notification` / `issue_notification`).
2. At least **two additional** distinct attempts (by `attempted_at` + `channel`) after that notification.
3. Every attempt must be attributable (`by_actor_id` present and non-null).
4. A free-text `rationale` summarizing why acknowledgment could not be obtained.

### Operational guidance (not SQL-hardcoded)

Operations SHOULD space follow-up attempts across business days and prefer multiple channels. A multi-day waiting period (historically discussed as ~7 days) is an **operational expectation**, not a database `interval` check. Agents and reviewers judge sufficiency from the logged attempts; the RPC refuses only malformed or under-attributed evidence.

## Late acknowledgment

A customer may acknowledge **after** `unavailable` was recorded or after the ticket was closed. That appends history and may change the effective response for that revision. It does **not** automatically reopen a closed ticket and does **not** clear machine safety restrictions or imply return-to-service approval.

## Refusal disposition

When the effective acknowledgment is `refused`, closure waits for an audited **manager disposition** (`admin`/`support`):

| Disposition | Meaning |
|-------------|---------|
| `accept_refusal_and_proceed` | Manager accepts the refusal; closure may proceed if other prerequisites hold |
| `create_follow_up` | Manager requires follow-up work; closure remains blocked until that work is reflected in jobs/visits/reviews (disposition alone does not invent jobs) |

Disposition is append-only and audited. It never rewrites the refusal row and never converts refusal into acceptance.

## Safety / return-to-service

Report acknowledgment and case closure do **not** clear machine safety restrictions and do **not** imply return-to-service approval. Safety gates remain visit/job artifacts (B3).
