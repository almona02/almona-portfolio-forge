# Search Service Spec — Enterprise Full‑Text and Faceted Search
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, BE Lead, QA Lead

Objective
Deliver fast, relevant search across projects, positions, and history with debounce, ranking, pagination, and typed contracts. Target P95 latency < 500ms at typical dataset sizes. Provide deterministic, testable interfaces for FE/BE.

Non-Functional Requirements
- Performance: P95 < 500ms server latency; FE debounce 300ms; cancel stale requests.
- Scalability: Pagination-first; backends must use appropriate indexes. Support 100k+ items.
- UX: Grouped results; keyboard navigation; query highlight; recent history; saved searches.
- Reliability: Idempotent reads; safe retries; cancellation support via AbortController.
- Security: RBAC filter on server; tenant isolation; safe query parsing (avoid injection).
- Accessibility: Announce result counts; keyboard navigation; focus management.

Search Domains
- projects: name, customer, system pack, status, tags, created/updated dates
- positions: dimensions (W×H), profile, material, production status, project link
- history: past projects, favorites, templates; audit log summaries (if exposed)

TypeScript Front-End Contract
/*
export type SearchType = 'projects' | 'positions' | 'history';

export interface SortSpec {
  field: string;            // e.g., "updatedAt", "score"
  dir: 'asc' | 'desc';
}

export interface Paging {
  page: number;             // 1-based
  perPage: number;          // max 100
}

export interface SearchFilters {
  // Projects
  status?: string[];        // e.g., ['active','archived','draft']
  dateRange?: { from?: string; to?: string }; // ISO 8601
  customerIds?: string[];
  systemPacks?: string[];

  // Positions
  material?: string[];      // e.g., ['aluminum','uPVC','glass']
  profile?: string[];
  productionStatus?: string[];
  width?: { min?: number; max?: number };
  height?: { min?: number; max?: number };

  // Common
  tags?: string[];
}

export interface SearchQuery {
  q: string;                // free-text query
  type: SearchType[];       // one or more domains
  filters?: SearchFilters;  // faceted filters
  sort?: SortSpec;          // optional sort override
  paging?: Paging;          // pagination
  includeHighlights?: boolean; // return matched snippets
}

export interface SearchResultItem {
  id: string;
  kind: SearchType;
  title: string;
  subtitle?: string;
  score?: number;           // 0..1 normalized if available
  highlights?: Array<{ field: string; snippet: string }>;
  meta?: Record<string, any>; // shape varies by kind
}

export interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  perPage: number;
  tookMs: number;           // server processing time
  groups?: Record<SearchType, number>; // counts per kind
}

export interface SearchError {
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INTERNAL';
  message: string;
  details?: any;
}

export interface ISearchService {
  search(query: SearchQuery, signal?: AbortSignal): Promise<SearchResponse>;
  suggest(query: Pick<SearchQuery, 'q' | 'type'>, signal?: AbortSignal): Promise<string[]>;
  recent(limit?: number): Promise<string[]>;  // recent queries
  saveSearch(name: string, query: SearchQuery): Promise<{ id: string }>;
  listSaved(): Promise<Array<{ id: string; name: string; query: SearchQuery; createdAt: string }>>;
  deleteSaved(id: string): Promise<void>;
}
*/

Frontend Behavior
- Debounce: 300ms for input; trigger on blur/Enter immediately.
- Cancellation: Abort previous inflight call when new query issued.
- Keyboard: Arrow keys to navigate grouped results; Enter selects; Esc closes.
- Empty State: Friendly copy and quick filters; recent searches shown.
- Error State: Retry and diagnostics (non-sensitive); rate-limit messaging.
- Loading State: Skeleton or shimmer with a11y aria-busy.

Relevancy &amp; Ranking (Backend Guidance)
- Ranking signals: textual relevance (BM25 or similar), recency (updatedAt), popularity (views), exact matches.
- Tie-breakers: exact field match > prefix > fuzzy.
- Domain boosts: projects > positions for top-level search unless overridden.
- Normalization: Lowercase; diacritics-insensitive; Arabic script normalization for market.

Backend API (Example)
- GET /api/search
  - Query params: q, type=projects|positions|history (repeatable), paging.page, paging.perPage, sort.field, sort.dir
  - Filters serialized as JSON or flattened keys (e.g., filters.status=active&amp;filters.status=archived)
  - Returns: SearchResponse
- GET /api/search/suggest?q=<text>&amp;type=projects
- GET /api/search/recent?limit=10
- POST /api/search/saved { name, query }
- GET /api/search/saved
- DELETE /api/search/saved/:id

Validation
- perPage ∈ [1, 100]; page ≥ 1
- q length ≤ 200 chars
- type non-empty; values ∈ allowed set
- date ranges valid ISO 8601 and from ≤ to

Error Model (HTTP)
- 400 BAD_REQUEST → invalid inputs (include field errors)
- 401 UNAUTHORIZED → not logged in
- 403 FORBIDDEN → lacks scope
- 429 TOO_MANY_REQUESTS → rate limit (Retry-After header)
- 500 INTERNAL_SERVER_ERROR → generic

Examples
Request:
/*
search({
  q: "profile 45 mm",
  type: ['projects','positions'],
  filters: {
    status: ['active'],
    width: { min: 600 },
    height: { max: 1600 }
  },
  sort: { field: 'updatedAt', dir: 'desc' },
  paging: { page: 1, perPage: 20 },
  includeHighlights: true
})
*/

Response:
/*
{
  "items": [
    {
      "id": "proj_123",
      "kind": "projects",
      "title": "Ahmed Villa Windows",
      "subtitle": "Customer: Ahmed Co. • Updated 2026-01-05",
      "score": 0.91,
      "highlights": [{ "field": "title", "snippet": "Windows with <em>profile</em> 45" }],
      "meta": { "status": "active", "customerId": "cust_9", "updatedAt": "2026-01-05T10:22:10Z" }
    }
  ],
  "total": 142,
  "page": 1,
  "perPage": 20,
  "tookMs": 112,
  "groups": { "projects": 87, "positions": 55 }
}
*/

Security &amp; Privacy
- Enforce tenant scoping and RBAC server-side.
- Sanitize inputs and guard against injection in search engines.
- Do not leak counts for restricted entities (return 403 or omit).

Testing
- Unit (FE): debounce, cancellation, pagination edge cases, error handling.
- Integration (FE+BE): relevancy ordering, filters combinations, highlights present.
- Load tests (BE): dataset 100k+, ensure P95 latency targets met.
- Accessibility: Screen reader announces result counts; keyboard traversal of results.

Acceptance Criteria
- Search returns relevant results with P95 < 500ms for typical datasets.
- Filters combine instantly in FE; server paginates accurately.
- Keyboard navigation and a11y verified.
- Saved searches persist per-user and load accurately.
