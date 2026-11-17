# Cursor actual-browser results — Lane C / ticket-header (local)

**Not Spark.** Staging-equivalent ticket RLS was established in the disposable DB battery **before** this smoke (`relrowsecurity=true` + staging SELECT/UPDATE policies + header RPC).  
**No staging apply. No production. No FR-1.**

| ID | Check | Result | Detail |
|----|-------|--------|--------|
| BR-01 | Vite local app serves `/login` | **PASS** | Chromium → `http://127.0.0.1:3011/login` · title contains Almona · email/password + Sign in visible |
| BR-02 | Authenticated tech ticket header journey (TR-07 end-to-end) | **NOT RUN** | Requires isolated Auth/PostgREST fixture users; staging credentials/apply unauthorized |

Supporting (not browser): TicketDetailPage technician path Vitest proves `getTechnicianTicketHeader` and zero `service_tickets` `select('*')` for role=technician.
