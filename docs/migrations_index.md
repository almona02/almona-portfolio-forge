# Migrations / Policies Ordering

Recommended execution order when introducing support role and RLS policies:

1. `add_support_role_enum.sql` (if existing DB without 'support')
2. `service_ticket_rls_full.sql` (replaces `fix_service_ticket_rls.sql`)
3. `seed_support_profile.sql` (optional test account)

Legacy file `fix_service_ticket_rls.sql` is retained for reference but superseded by `service_ticket_rls_full.sql`.

## Seeding Support Role Safely

The `profiles.id` column is a FK to `auth.users.id` (Supabase). You cannot insert an arbitrary UUID row into `profiles` without a matching auth user. The `seed_support_profile.sql` script now updates an existing profile whose auth user email you specify (default placeholder: `support_qa@example.com`). Steps:

1. Create a normal user via your app (signup) with the target email.
2. Run `seed_support_profile.sql` after adjusting the email.
3. Verify role change:
	```sql
	SELECT id, email, role FROM profiles JOIN auth.users ON profiles.id = users.id WHERE email='support_qa@example.com';
	```
4. Revert by updating role back to `customer` if needed:
	```sql
	UPDATE profiles SET role='customer' WHERE id = (SELECT id FROM auth.users WHERE email='support_qa@example.com');
	```
