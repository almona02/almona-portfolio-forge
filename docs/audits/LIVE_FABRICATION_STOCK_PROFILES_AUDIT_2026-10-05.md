# Fabrication Services, Stock and Profiles audit

Date: 5 October 2026

## Scope and evidence

Inspected https://www.almona02.com/fabrication-services, https://www.almona02.com/fabricator/studio/data/stock and https://www.almona02.com/fabricator/studio/data/profiles in the browser. Studio used the existing signed-in session with an active ROCK 60 project. Reviewed the corresponding local source. Local source is supporting evidence; its revision has not been proven identical to production.

This was an audit, not a repair. No consultation was submitted, profile saved, file uploaded or purchase recorded. Loading Stock invokes an existing stock synchronization routine in the local implementation. No independent database inspection, authorization test, mobile breakpoint test or performance benchmark was performed. No errors/warnings were captured in the inspected tabs; this does not establish backend health.

## Findings

### 1. P1 — Public calculator options do not change the calculation

Live: entering width 150 and height 150 produces 2.25 m² and EGP 9,864 for Standard Profile, Double Glazing and Casement. Clicking Premium Profile and calculating again retains Standard Profile and the same total. The option lists appear as ordinary text and expose no comboboxes.

Source: FabricationServices.tsx imports components/ui/select.tsx. That Select clones only its direct children; SelectContent does not forward onValueChange to SelectItem. SelectValue always renders its placeholder. This affects profile, glass, opening and consultation project-type selection. The shared/ui/ui/select.tsx implementation is a real Radix select.

Fix: use the accessible shared select consistently; verify every option changes the displayed selection and estimate. Also normalize dependent selections on system changes: IDs such as argon and tilt-turn do not exist in Aluminum, and low-e and folding do not exist in UPVC. calculateEstimate dereferences find results without guards (FabricationServices.tsx:207–215), which will become a crash path once selection is repaired.

### 2. P1 — Consultation form has no lead-submission implementation

Live: consultation CTA opens the form, promising contact within 24 hours. Submission was not attempted.

Source: FabricationServices.tsx:998 renders a form without onSubmit, action or API integration; inputs are not required and have no name attributes. Submit Request is an ordinary submit button. There is no implemented lead delivery or confirmation path; native form submission may reload the page rather than create a lead.

Fix: wire a validated submission endpoint, error/retry feedback and a success receipt. Pass the requested system and calculated specifications separately from project type: Get Detailed Quote currently passes upvc/aluminum into project-type state, whose options contain neither value (line 581).

### 3. P1 — Stock is an empty-state dead end for the inspected project

Live: Stock shows “No Inventory Data Yet” and tells the user to add/import profiles in a “Profile Management section above.” That section is absent. There is no intake/import CTA in the content area.

Source: StudioStockPage.tsx:19–45 builds inventory from the active system pack/catalog, not the user's persisted fabricator_profiles. With an active pack it excludes other packs and custom profiles. InventoryDashboard.tsx:974 returns early for an empty list, hiding purchase, CSV, remnant and history interfaces regardless of independently loaded data. The local resolver now supports ROCK 60, whereas live ROCK 60 is empty; check deployed revision and actual pack resolution before attributing that live mismatch to a specific source change.

Fix: load workshop inventory as the authoritative source, apply an explicit optional system filter, and keep onboarding/import/history reachable in empty and error states. Link the empty state directly to Profiles.

### 4. P1 — Catalog/custom profile IDs are incompatible with stock persistence

Source finding, not verified by writing to production: StudioStockPage supplies catalog codes or custom timestamp IDs as Profile.id. InventoryDashboard inserts them as stock_movements.profile_id (line 597) and updates fabricator_profiles by the same ID (line 612). migrations/006_remnant_management.sql:145 defines profile_id as UUID referencing fabricator_profiles; the profile table also uses UUID IDs. Catalog identity is not a persisted workshop profile ID.

Fix: materialize catalog/custom profiles into owned fabricator_profiles rows and retain catalog codes as separate identifiers. Use returned UUIDs for movements, pricing and stock updates.

### 5. P1 — Profile saving is local-only and the editor does not reload saved profiles

Live: Profiles opens an empty “Turkish Custom Profiles” creation form, with no existing profile library, search or edit controls.

Source: ProfileStudioLite.tsx:115 initializes importedProfiles to []; currentSystemPackId also resets on mount. The save path uses synchronous addCustomSystem (line 419) and localStorage, without the available Supabase save function. Reopening the route starts a new system rather than resuming the previously created system. The page's general “AUTOSAVE Saved / CONNECTION Online” status does not establish cloud persistence for this form.

Fix: provide a persisted profile library and explicit create/edit system context. Save with the authenticated workshop owner and clearly distinguish draft, local save and server confirmation.

### 6. P1 — DXF import fabricates geometry and overstates what will be saved

Source: ProfileStudioLite.tsx:172–198 treats thermal-break detection as evidence of both frame and sash, inventing sash width, height and weight at 90% of frame values. Thermal-break construction does not identify a second profile's role or dimensions. The verification UI says “Both profiles will be saved” (line 625), but addImportedProfile constructs only the current form's profile (line 303). The frontend fallback stores parsed output in an unused state field rather than copying its measured geometry into the form.

Fix: derive each profile from measured entities/layers, require role confirmation and save exactly the verified set. Never synthesize production dimensions from a multiplier. Show fallback limitations and prevent unverified geometry from being treated as measured.

### 7. P1 — Profile form accepts invalid physics and silently changes material

Source: ProfileStudioLite.tsx:466 validates only name and manufacturer. Numeric fields have no bounds; zero/negative bar lengths, weights and kerfs can be saved. Missing geometry becomes 60 mm width/height and 1.8 mm thickness (lines 374–376). Steel becomes aluminum (line 373), while cuttingAllowance is always 3. The created pack is always marked sliding regardless of the intended system.

Fix: validate finite values and engineering constraints; preserve material; require geometry or mark it explicitly unverified; derive allowances and system behavior from confirmed configuration.

### 8. P1 — Stock intake can use stale totals and perform partial writes

Source finding, not exercised live: InventoryDashboard.tsx:596–624 inserts a movement, then separately updates stock_quantity using the incoming inventory prop plus the new length. It refreshes movements/alerts but not inventory; StudioStockPage's inventory memo changes only when the active pack ID changes. Repeated intakes can calculate from stale quantities. CSV updates ignore update errors (lines 533–545). A successful movement followed by a failed quantity update leaves a partial operation; retry can duplicate the movement.

Fix: persist movement and quantity change atomically through a database operation, use idempotency keys, and reload authoritative inventory after success. Do not compute new totals from stale catalog props.

### 9. P2 — Portfolio and resources are unfinished

Live: View Full Portfolio leaves URL and page state unchanged.

Source: the portfolio button (FabricationServices.tsx:838) and all three Access Now resource buttons (line 883) have no handlers or links. Gallery entries are six generated titles rather than distinct project records. Hero/gallery image paths are absent from the inspected local public directory; production asset status was not independently established.

Fix: link real portfolio entries and resources, or remove unavailable controls. Verify deployed image responses and provide image descriptions.

### 10. P2 — Accessibility and workflow-status semantics need correction

Live: opening consultation leaves focus on the triggering button; the accessibility tree does not expose a dialog. Stock is marked “In progress” on Stock and “Not recorded” on Profiles for the same project. The stock screenshot also highlights Systems alongside Stock/remnants.

Source: consultation is implemented as generic motion divs with no dialog semantics/focus management (FabricationServices.tsx:977–995). Feature expansion is attached to Card onClick (line 706), without keyboard button semantics.

Fix: use an accessible Dialog and button/accordion controls; derive workflow completion from persisted records rather than the current route. Highlight only the relevant data-navigation destination.

## Recommended implementation order

1. Repair public selects and consultation submission; remove dead CTAs.
2. Establish one persisted workshop profile identity and inventory source shared by Profiles, Stock, BOM and optimization.
3. Make profile import measurement-based and validate all production settings.
4. Make intake atomic, refresh authoritative stock, and retain useful empty/error states.
5. Add accessible dialogs and expansion controls; correct navigation and status indicators.

## Focused acceptance checks

- 150 × 150 cm Standard/Double/Casement gives the current formula's EGP 9,864; Premium gives EGP 12,947 after rounding. Changing glass/opening/system updates selections without undefined configuration.
- A valid consultation creates exactly one lead and shows confirmation; invalid fields and failed requests have actionable feedback.
- A saved profile survives route navigation and another authenticated browser/device; stock uses its database UUID.
- Two sequential intakes and concurrent intakes produce the correct sum without duplicate movements or stale UI totals.
- Empty stock retains import/setup actions and does not hide recorded remnants/history.
- DXF verification and saved geometry agree exactly; no inferred 90% sash or silent material conversion.
- Keyboard users can operate selectors, expand features and open/close consultation with correct focus behavior.
