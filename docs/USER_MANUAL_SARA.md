# 💼 Accountant Manual - Sara

**Role:** Financial Controller & Gatekeeper
**Objective:** Ensure profitability and technical validity before "locking" a design.

---

## 🔒 The Commercial Lock
The **Commercial Lock** is your primary tool. It prevents invalid or unprofitable designs from reaching the workshop floor.

### How to Verify a Project:
1.  **Open Engineering Bay**: Look for the project status.
2.  **Review BOM**: Check the `Bill of Materials` card.
    *   Look for yellow ⚠ warning signs.
    *   Verify that "Profile Costs" match the current database prices.
3.  **Optimization Check**:
    *   Verify the **Waste %**. If > 18%, ask Ahmed/Design to re-optimize.
    *   Verify **Margin**. If < 25%, the system flag it as "Low Profit".
4.  **Locking**:
    *   Once satisfied, click **"Lock Design"** (if available in your UI permission set).
    *   *Note: In the current Release Candidate, this is automated via the `validateDesign` check.*

## 📋 System Packs & Pricing
*   You manage the **System Packs**.
*   Ensure `pricePerSqm` in the database matches current market rates.
*   The system automatically calculates:
    *   `Profile Cost` x `Length`
    *   `Glass Cost` x `Area`
    *   `Accessories` (Fixed Rate or Itemized)

## ⚠️ Common Flags
*   **"System Mismatch"**: A profile was selected that doesn't belong to the system pack.
*   **"Cost Undefined"**: A custom profile has 0 cost. Update it immediately.

---
*Almona Finance Protection System v1.0*
