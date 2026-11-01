# Public registration role boundary

The normal ALMONA user role is stored as customer. New registrations must never select an application authority role from editable signup metadata.

Production inspection found profiles.role defaulting to admin while handle_new_user omitted the role. The migration corrects the default and explicitly creates customer, is_verified=false profiles for email and OAuth registrations. The trigger fails closed on profile creation errors. Browser fallback profile creation also sends the safe values explicitly. Existing roles are preserved; audit existing administrator grants separately rather than guessing which grants were accidental.

The existing protect_profile_privileges trigger continues to reject browser role/verification changes. The signup trigger function has a fixed empty search path and no public execute permission. This change does not grant access or relax RLS.

Run npm run test:signup-default for isolated PostgreSQL/PGlite verification. It tests ordinary registration, metadata role spoofing, OAuth metadata spoofing, default drift, unchanged existing admins and self-promotion rejection. The SQL in supabase/tests/signup_customer_default_test.sql is intended for isolated or explicitly approved test databases. It rolls back its fixtures, but real Auth hooks may have external effects; do not run synthetic signup writes in production without explicit approval. Production was verified through read-only catalog inspection after applying the migration. The Signup Default Role workflow runs these checks without production credentials.

The technical visibility harness is included in the same PR. Its baseline is deliberately not accepted automatically; see docs/ci/visibility.md.

Production migration version: 20261021201540. Read-only verification confirmed customer as the default and unchanged existing role counts. The optional synthetic production test was rejected by automatic approval review; it was not executed.
