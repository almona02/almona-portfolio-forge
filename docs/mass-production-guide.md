## Mass Production Mode – Operator Guide

This guide explains how to use the **Mass Production Optimizer** cockpit to batch‑optimize cutting plans across many jobs while consuming remnants first.

---

### 1. Prerequisites

- **Single‑job optimization completed**
  - Each job you want to include must already be optimized in the main **Fabricator Workflow**.
  - The job needs a valid cutting plan (no red error banners in the single‑job view).
- **Stable internet / backend connectivity**
  - Mass production mode calls the optimization backend and the **Remnant Manager**.
- **Operator access**
  - You must be signed in with a user that has permission to use mass production and remnant features.

---

### 2. Opening the Mass Production Dashboard

- **Navigate to the Fabricator Workflow** and select a project as usual.
- Open the **Mass Production** section (usually in the production / optimization area).
- You will see the **Mass Production Optimizer** card and the **Optimized Jobs** list.
- If no jobs are listed, you will see:
  - “No optimized projects are available yet” – first finish single‑job optimization for at least one project.

---

### 3. Selecting Jobs for a Mass Run

- **Optimized Jobs list**
  - Each row represents a job with a completed cutting optimization.
  - For each job you see:
    - Order number and position (e.g. `ORD-123 · POS-01`)
    - Dimensions in mm (width × height)
    - Window type (e.g. `TILT_TURN`, `FIXED`, etc.)
    - **Eff.** badge – current nesting efficiency for this job.
    - **Waste** badge – current waste percentage for this job.
- **Selecting jobs**
  - Click a row to toggle selection.
  - A selected job shows an orange border and a filled checkbox.
  - The **Selected** counter under the list shows how many jobs are currently included.
- **Recommendations**
  - Group jobs with similar profiles (same systems / colours) for best results.
  - Start with **5–20 jobs** while you gain confidence, then scale up.

---

### 4. Configuring Optimization Settings

On the right‑hand side you will see **Optimization Settings**:

- **Minimise Waste**
  - When **On**, the optimizer focuses on reducing total material waste.
  - This also tightens the remnant utilisation thresholds, favouring higher utilisation.
- **Use Remnants First**
  - When **Enabled**, the system will consume suitable remnants from the Remnant Manager before creating new stock lengths.
  - When **Disabled**, remnants are not used; the run will only use new stock.
- **Prioritise Production Time**
  - When **On**, the optimizer is allowed to choose patterns that reduce the total number of cuts / bars even if waste increases slightly.
  - Use this in high‑load situations where throughput matters more than material cost.
- **Prioritise Quality**
  - When **On**, the optimizer is allowed to be more conservative (e.g. fewer small offcuts, better grouping) to help production and QC.

You can safely change these options between runs without losing previous results.

---

### 5. Running a Mass Production Optimization

1. **Select jobs**
   - Choose one or more jobs in the **Optimized Jobs** list.
2. **Check settings**
   - Confirm **Minimise Waste** / **Use Remnants First** / **Time** / **Quality** toggles as needed.
3. **Start the run**
   - Click **Run Mass Optimization**.
   - The button shows a spinning clock icon and “Optimizing…” while the run is in progress.
4. **Wait for completion**
   - The UI remains interactive, but you cannot start a second run until the current one finishes.
5. **Completion badge**
   - When finished, a **Run Completed** badge appears in the header.
   - You will also see the combined waste improvement vs. baseline.

If anything fails, you will see a red **Error** banner with a human‑readable message.

---

### 6. Understanding the Result Metrics

In the **Optimization Result** card you will see:

- **Baseline Waste**
  - The average waste percentage **before** mass mode, based on individual job optimizations.
- **Final Waste**
  - The waste percentage **after** mass‑mode optimization and remnant usage.
- **Improvement**
  - Percentage improvement vs. baseline.
  - Example: baseline 20% → final 12% gives a 40% improvement.
- **Material utilisation bar**
  - A progress bar that shows how much of the bar length is used after optimization (higher is better).
  - Tooltip text: “Higher is better (material utilisation)”.
- **Project count**
  - The number of projects included in this run.

#### Remnant Utilisation

If remnants were used, you will also see **Remnant Utilisation**:

- **Used**
  - Total number of remnants consumed in the run.
- **Avg. Utilisation**
  - Average percentage of each remnant’s length that was actually used.
  - Higher values mean fewer “tails” and better use of stock.

---

### 7. Typical Error Messages and How to Fix Them

- **“Please select at least one optimized project.”**
  - You clicked **Run Mass Optimization** without selecting any jobs.
  - Fix: Select one or more rows in the **Optimized Jobs** list.
- **“MassProductionOptimizer: project \"…\" is missing baseline optimization. Run single-project optimization first.”**
  - A selected job has no valid cutting plan.
  - Fix: Open that job in the main workflow, run single‑project optimization, then return to mass mode.
- **“MassProductionOptimizer: projectLoader returned no projects.”**
  - The optimizer could not load data for the selected project IDs (backend or connectivity issue).
  - Fix: Check network, retry; if it persists, escalate to IT / support.
- **“MassProductionOptimizer: projectLoader did not return projects for ids: …”**
  - Some selected IDs could not be resolved (e.g. data inconsistency, deleted job).
  - Fix: Deselect the listed jobs and re‑run; then report the missing IDs to support.
- **“MassProductionOptimizer: requested X projects, which exceeds the configured maxProjects limit of Y.”**
  - You attempted to run more projects in one batch than the safety cap allows.
  - Fix: Split the jobs into smaller groups and run them in several batches.

For persistent or unclear errors, capture a screenshot including the **Error** banner and send it to your technical contact along with the list of selected jobs.

---

### 8. Best Practices for Operators

- **Start small**
  - Begin with 5–10 jobs to understand the behaviour and metrics.
- **Group logically**
  - Prefer batches with the same profile system, colour, and similar dimensions.
- **Monitor improvement**
  - Track **Improvement** and **Final Waste** over time to confirm gains.
- **Review remnants policy**
  - Periodically align the **Use Remnants First** and **Minimise Waste** options with your factory’s material and labour cost structure.
- **Document decisions**
  - For large batches, note why certain jobs were grouped (e.g. “all white 70mm casements for Route A”).

Used consistently, the Mass Production Optimizer helps reduce waste, stabilise remnant stock, and keep production runs more predictable and repeatable.


