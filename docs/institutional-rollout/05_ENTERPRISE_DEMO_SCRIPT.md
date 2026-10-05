# Enterprise Demo Script
## Constitutional Governance Walkthrough

## Demo Overview (15 minutes)
**Goal**: Demonstrate constitutional governance to enterprise/regulator stakeholders

---

## Part 1: Constitutional Foundation (3 minutes)

### Step 1: Show AICS-001 Specification
> "This is our constitutional law - the supreme source of truth for all system behavior"

**Key Points:**
- Formal specification, not just documentation
- Defines 5 truth domains and 5 execution classes
- All system behavior derives from this document

### Step 2: Show Wiring Manifest
> "This translates constitution into code - every component has explicit authority"

**Demonstrate:**
- Open `src/components/fabricator/wiring-manifest.yaml`
- Show truth domain definitions
- Show execution class assignments

---

## Part 2: Governance Enforcement (5 minutes)

### Step 1: Health Dashboard
> "Real-time constitutional health monitoring"

**Show metrics:**
- Constitutional Health: 98/100
- Tier 3 Purity: 95%
- Truth Clarity: 100%
- Active Violations: 0

### Step 2: Advisory Intelligence Boundaries
> "This is Tier 2 advisory - suggestions only, never execution"

**Demonstrate:**
- Amber border indicating advisory zone
- Tier badge with classification
- "No execution authority" disclaimer
- Human review required flag

### Step 3: Audit Trail
> "Every advisory decision is logged with complete traceability"

**Show:**
- Timestamp of decision
- Input/output hashes for reproducibility
- Confidence scores with disclosure
- Component classification

---

## Part 3: Violation Simulation (4 minutes)

### Step 1: Attempt Constitutional Violation
> "Watch what happens when we try to add AI to a protected zone"

**Demonstrate:**
```typescript
// Attempt to add AI import to Tier 3 component
import { YDTService } from '@/lib/ydt/YDTService';
```

### Step 2: Show CI Blocking
> "The CI pipeline detects and blocks this violation"

**Show:**
- WiringValidator error message
- Clear identification of violation type
- Build failure preventing deployment

### Step 3: Fix and Proceed
> "Proper constitutional compliance allows deployment"

**Demonstrate:**
- Remove illegal import
- CI passes
- Deployment proceeds

---

## Part 4: Institutional Continuity (3 minutes)

### Step 1: Show /future/ Directory
> "44 components preserved as institutional knowledge - zero knowledge loss"

**Explain:**
- Dormant capabilities preserved
- Activation requirements documented
- No execution authority until activated

### Step 2: Amendment Process
> "How we add new capabilities lawfully"

**Steps:**
1. Formal amendment proposal
2. 30-day review period
3. Implementation with guardrails
4. CI validation
5. Manifest ratification

### Step 3: Deterministic Replay
> "Same inputs produce same outputs - provably, legally defensible"

---

## Key Messages

| Point | Message |
|-------|---------|
| Trust | "Governance isn't policy - it's code that blocks violations" |
| Audit | "Every decision traceable, verifiable, defensible" |
| Continuity | "Survives team changes, technology shifts, market evolution" |
| Risk | "AI bounded, execution deterministic, authority explicit" |

---

## Q&A Preparation

### Q: "What if confidence is 99% but constraints are violated?"
**A:** "System stop. Confidence isn't authority. Violation triggers immediate halt."

### Q: "How do you handle material specification changes?"
**A:** "Constitutional amendment process. 30-day review, validation gates, human approval."

### Q: "Can this system be audited by external regulators?"
**A:** "Yes. We passed institutional audit simulation 8/8. Full audit trail available."

### Q: "What's your incident response for governance violations?"
**A:** "CI blocks deployment. Investigation required. Emergency amendment if needed."

---

## Demo Success Criteria

- [ ] Stakeholders understand constitutional vs conventional software
- [ ] Can articulate key guarantees (deterministic replay, no silent AI, etc.)
- [ ] See value in institutional-grade governance
- [ ] Trust through observable enforcement, not promises
