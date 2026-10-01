from __future__ import annotations

from typing import Any, Dict, List, Optional
from supabase import Client  # type: ignore


class QuotesRepository:
    """Persistence layer for quotes and quote items."""

    def __init__(self, supabase: Client):
        self._db = supabase

    def insert_quote(self, insert_data: Dict[str, Any]) -> Dict[str, Any]:
        result = self._db.table("quotes").insert(insert_data).execute()
        rows = getattr(result, "data", []) or []
        if not rows:
            raise RuntimeError("Quote insert returned no data")
        return rows[0]

    def insert_quote_items(self, items_payload: List[Dict[str, Any]]) -> None:
        if not items_payload:
            return
        self._db.table("quote_items").insert(items_payload).execute()

    def update_quote_total(self, quote_id: str, total: Optional[float]) -> None:
        self._db.table("quotes").update({"total_amount": total}).eq("id", quote_id).execute()

    def delete_quote(self, quote_id: str) -> None:
        self._db.table("quotes").delete().eq("id", quote_id).execute()

    def insert_quote_atomic(
        self, header: Dict[str, Any], items: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Single-transaction create when public.create_quote_with_items exists."""
        try:
            result = self._db.rpc(
                "create_quote_with_items",
                {"_header": header, "_items": items},
            ).execute()
        except Exception as exc:
            message = str(exc).lower()
            if (
                "pgrst202" in message
                or "could not find the function" in message
                or "does not exist" in message
            ):
                return None
            raise
        rows = getattr(result, "data", None)
        if not rows:
            return None
        if isinstance(rows, dict):
            return rows
        if isinstance(rows, list):
            return rows[0] if rows else None
        return None

    def rpc_quote_lookup(self, query: str) -> List[Dict[str, Any]]:
        rpc_response = self._db.rpc("portal_quote_lookup", {"_query": query}).execute()
        return getattr(rpc_response, "data", []) or []


