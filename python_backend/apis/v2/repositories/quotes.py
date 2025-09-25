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

    def rpc_quote_lookup(self, query: str) -> List[Dict[str, Any]]:
        rpc_response = self._db.rpc("portal_quote_lookup", {"_query": query}).execute()
        return getattr(rpc_response, "data", []) or []


