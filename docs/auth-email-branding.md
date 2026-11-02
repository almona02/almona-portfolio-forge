# ALMONA auth email branding

Signup confirmation and password-recovery messages should look like official ALMONA mail, not the default Supabase notice.

## Templates in this repo

| Template | Path | Purpose |
| --- | --- | --- |
| Confirmation | `supabase/templates/confirmation.html` | Email verification after signup |
| Recovery | `supabase/templates/recovery.html` | Password reset |

Local CLI wiring lives in `supabase/config.toml` under `[auth.email.template.*]`.

## Production (Supabase Dashboard)

1. **Authentication → Emails** — paste each HTML template (or upload via Management API). Subject lines:
   - Confirmation: `Confirm your ALMONA account`
   - Recovery: `Reset your ALMONA password`
2. **Authentication → SMTP Settings** — enable custom SMTP so mail is sent from `info@almona02.com` (or `noreply@almona02.com` with Reply-To `info@almona02.com`).
3. **Sender name**: `ALMONA`
4. Keep Site URL / redirect URLs pointing at `https://www.almona02.com` (and local/preview origins as needed).

Without custom SMTP, Supabase still sends from its shared domain even if the HTML is branded — customers notice that. Use a verified `almona02.com` mailbox or ESP (Resend, Postmark, SendGrid, etc.).

## Contact address

Public contact copy uses `info@almona02.com`. Keep `VITE_CONTACT_EMAIL` / `VITE_SUPPORT_EMAIL` aligned in deployment env.
