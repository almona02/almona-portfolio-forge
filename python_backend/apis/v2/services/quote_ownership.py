"""Resolve quote ownership using Supabase's verified user, never body claims."""
from uuid import UUID

from fastapi import HTTPException
from httpx import HTTPError
from supabase import AuthApiError, AuthError, Client


def resolve_quote_owner(
    client: Client,
    authorization: str | None,
    requested_user_id: str | None,
) -> str | None:
    if authorization is None:
        if requested_user_id is not None:
            raise HTTPException(401, "Sign in to assign quote ownership")
        return None

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(401, "Invalid authorization header")

    try:
        # Explicit token verification does not mutate the shared client's session.
        response = client.auth.get_user(parts[1])
    except AuthApiError as exc:
        if exc.status >= 500 or exc.status == 429:
            raise HTTPException(503, "Authentication service unavailable") from exc
        raise HTTPException(401, "Invalid or expired session") from exc
    except (AuthError, HTTPError) as exc:
        raise HTTPException(503, "Authentication service unavailable") from exc

    user_id = response.user.id if response and response.user else None
    if not isinstance(user_id, str):
        raise HTTPException(401, "Invalid or expired session")
    try:
        verified_id = UUID(user_id)
    except ValueError as exc:
        raise HTTPException(401, "Invalid session identity") from exc

    if requested_user_id is not None:
        try:
            matches = UUID(requested_user_id) == verified_id
        except ValueError:
            matches = False
        if not matches:
            raise HTTPException(403, "Quote owner must match the signed-in user")

    return str(verified_id)
