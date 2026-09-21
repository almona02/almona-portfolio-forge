# Quote ownership verification

The quote-create route derives ownership from a Supabase-verified Bearer session.
The optional legacy `user_id` field remains accepted only when it matches that
identity. Guest requests must omit it (or send null). Malformed/expired sessions
return 401, mismatched owners return 403, and authentication outages return 503;
none continue to quote persistence. Session verification does not change the
shared backend client's auth state.

Both quote dialogs send the current Supabase access token. They reject a missing
or changed session when the form expects a signed-in owner. Deploy the frontend
before the backend enforcement; stale clients that submit an owner without a
token must refresh/sign in. Ownerless guest enquiries remain supported.

Tests exercise the real route with mocked Supabase/ERP infrastructure, including
proof that rejected requests never call quote persistence. This change requires
application deployment; it does not modify the live database. Atomic quote/item
writes, linked machine/ticket authorization, and the wider RLS audit remain
separate work.
