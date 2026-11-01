# Marketplace browser-state reliability — 2026-10-20

## Evidence and limits

- Customer reached the React error fallback in their normal browser; a private tab or another browser worked. This narrows the investigation to persistent browser state, extensions, and session differences. It does not prove a specific exception.
- Production `/sw.js` binds navigation requests to a precached `index.html`, without excluding marketplace routes. A waiting worker requires activation before it replaces that shell.
- The shell precaches eager JavaScript while lazy page chunks enter runtime cache only when visited. An old shell can therefore request an old, uncached route chunk after deployment.
- The old loader only refreshed for text containing `404`/`not found`; browser module errors commonly hide the HTTP status. Storage access and JSON parsing could also fail before the import.
- A direct anonymous request to the deployed public database returned HTTP 200 and seven active listings during diagnosis. Failed listing requests were silently rendered as empty inventory.

## Implemented in PR 108

- Retry recognized module/CSS download failures once, then allow one guarded refresh per route component per tab. Successful loads do not clear the refresh guard. Offline or unavailable storage does not cause refresh loops.
- Before that refresh on marketplace routes only, check for a new worker and activate an available waiting replacement. Each lookup/update/install/activation wait is bounded. Normal operator update prompts remain user-controlled.
- Exclude `/used-machines`, its detail/sell paths, query strings, and legacy `/usedmachines` paths from the cached navigation fallback. Fetch marketplace document requests with `NetworkOnly` and `cache: no-store`. Existing fabrication navigation policy remains in place.
- Keep inventory failures distinct from empty results and offer retry while keeping the sell form accessible.

## Release acceptance

1. Run the focused recovery, listing failure, and PWA update tests; build production; pass the repository type baseline gate.
2. Inspect generated `dist/sw.js`: marketplace fallback denylist and a same-origin, navigation-only NetworkOnly rule must both be present.
3. Before production rollout, use a persistent mobile browser profile on release A. Visit the site without visiting the lazy marketplace route, publish release B, then open the marketplace in that same profile. Verify listings, detail navigation, and the sell form; confirm no recurring reloads.
4. Repeat with a waiting worker, blocked storage, interrupted network, and a second fabrication tab containing unsaved work. Verify routine releases never force-reload a seller form or fabrication workspace.
5. Check the public listing count and actual card rendering as an anonymous visitor after deployment. Exercise submission in a designated test environment; do not create production test listings.

Unit tests and a successful build do not substitute for the two-release persistent-browser check. Browser cache migration cannot be guaranteed from a screenshot. Existing workers need to receive and activate the new worker; old clients running old JavaScript cannot execute new recovery code until they load the new release. Marketplace browsing requires a connection under the new document policy.

## Recommended next work, in order

1. **Deployment compatibility:** retain prior hashed assets for a defined support window, or enable verified hosting skew protection. New entry HTML should revalidate; hashed JS/CSS can remain immutable. Verify actual hosting-plan support before relying on it.
2. **Seller draft recovery:** save non-sensitive draft fields locally as the seller types; restore them after reload with a clear discard option. Do not silently persist contact details or photos without a deliberate privacy/retention design. Add duplicate-submission protection on the server before automatic submission retries.
3. **Production visibility:** report route, release identifier, error category, browser version and worker state for frontend failures; exclude listing text, phone numbers, tokens and uploaded files. Track page-load failures, inventory-request failures and submission failures separately. Select a reporting service and retention policy before sending telemetry externally.
4. **Release gates:** automate the two-release returning-browser scenario, mobile anonymous browse/post flow, slow-network behavior and retry recovery. Monitor a successful inventory request and visible listing cards, not just HTTP 200 on the SPA shell.
5. **Architecture:** consider serving the public marketplace independently of the offline fabrication app, with offline worker scope limited to the workspace. Migrate the existing root worker deliberately; changing the new scope alone does not remove old root registrations.

## Sources

- Workbox navigation fallback and denylist: https://developer.chrome.com/docs/workbox/modules/workbox-build
- Cache strategies: https://developer.chrome.com/docs/workbox/modules/workbox-strategies
- Worker updates and waiting activation: https://developer.chrome.com/docs/workbox/modules/workbox-window
