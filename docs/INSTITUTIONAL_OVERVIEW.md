# Engineering overview

ALMONA Portfolio Forge supports aluminium and UPVC workshop planning, fabrication and equipment service. Its engineering model separates user interaction, manufacturing calculations, operational records and machine interfaces.

## Governing requirements

[AICS-001](AICS-001_ALMONA_INDUSTRIAL_COMPUTING_SPECIFICATION.md) is the project's engineering specification. The [RealityOS constitution](architecture/REALITYOS_CONSTITUTION.md) defines domain verification principles. These internal specifications do not establish external accreditation or independent certification.

1. Preserve project, position and revision identity across workflow transitions.
2. Base manufacturing calculations on approved dimensions, profiles, material rules and machine constraints.
3. Keep advisory intelligence separate from deterministic manufacturing authority.
4. Require validation and appropriate operator approval before production release.
5. Retain traceable evidence for changes affecting manufacturing or operational records.

## Implementation boundaries

| Concern | Primary implementation |
| --- | --- |
| Workflow identity and state | [Workflow store](../src/store/workflowStore.ts) |
| Authority and governance | [Authority layer](../src/core/authority/constitution/) |
| Bounded assistance | [Intelligence gate](../src/lib/ydt/IntelligenceGate.ts) |
| Machine interfaces | [Machine connectors](../src/machine-connectors/) |
| Service APIs | [Python backend](../python_backend/) |
| Verification | [Tests](../tests/) and [CI workflows](../.github/workflows/) |

## Evidence and acceptance

Assess each release against its exact revision, test results, configuration and supported equipment. Record failures and unverified integrations explicitly. A successful build demonstrates packaging; a passing type baseline demonstrates no detected regression against that baseline. Neither proves manufacturing acceptance.

Claims of accuracy, performance, security compliance or production readiness require reproducible evidence and a defined scope. Machine connectivity additionally requires compatible hardware, configured protocols and physical validation.

See the [README](../README.md) for setup and checks, [CI documentation](ci/README.md) for gate semantics, and [repository policy](PROJECT_LAYOUT.md) for retained-file criteria.
