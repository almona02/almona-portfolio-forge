import { useState, useCallback, useEffect } from 'react';

interface QuoteSummary {
  id: string;
  quote_number: string;
  status: string;
  digital_twin_code?: string | null;
  portal_reference?: string | null;
  total_amount?: number | null;
  related_service_ticket_id?: string | null;
  created_at: string;
}

interface LookupResponse {
  results: QuoteSummary[];
  count: number;
}

interface UseQuoteLookupReturn {
  query: string;
  setQuery: (q: string) => void;
  results: QuoteSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEBOUNCE_MS = 400;

export function useQuoteLookup(apiBase = import.meta.env.VITE_PYTHON_API_URL): UseQuoteLookupReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuoteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceReloadToken, setForceReloadToken] = useState(0);

  const fetchQuotes = useCallback(async (activeQuery: string) => {
    if (!activeQuery || activeQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const url = `${apiBase}/api/v2/quotes/lookup?q=${encodeURIComponent(activeQuery)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Lookup failed (${resp.status})`);
      }
      const data: LookupResponse = await resp.json();
      setResults(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchQuotes(query.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, fetchQuotes, forceReloadToken]);

  const refetch = useCallback(() => setForceReloadToken(v => v + 1), []);

  return { query, setQuery, results, isLoading, error, refetch };
}

export type { QuoteSummary };
