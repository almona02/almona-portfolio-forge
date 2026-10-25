# Dependency security repair — PR #111

The Python CI manifest resolves successfully for Linux/Python 3.11 after upgrading Brotli to 1.2.1, graphql-core to 3.2.12, setuptools to 84.1.0, and the OpenTelemetry API/SDK/proto family to 1.45.1 with semantic conventions 0.66b1. Auditing the fully resolved dependency list reports no known vulnerabilities using only the existing PYSEC-2026-1325 exception. certifi was already pinned to the patched 2026.10.19 release; its attached alert reflects the older default-branch dependency snapshot.

Updated both npm lockfiles. Storybook 10.6.3, Vitest 4.1.12, Vite 7.3.7 and Markdown-it 14.3.3 address the listed frontend advisories. Updated redirect, IP parsing, serialization, URI parsing and HTTP overrides. Lighthouse 13.5.0 removes extract-zip and the obsolete telemetry instrumentation dependency chain. Its runtime requirement is reflected in package engines and Node 22.22.2 CI pins.

Root npm audit: 42 findings before, 1 after. Mobile npm audit: 10 before, 8 after; the remaining mobile entries are one node-forge advisory propagated through its dependents.

## Remaining work (not dismissed or suppressed)

- [node-forge GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv): all published versions through 1.4.0 are affected; 1.4.0 remains the latest release. Expo and React Native development tooling depend on it. An upstream patch or a separately reviewed replacement is required. No private crypto patch was invented and no advisory was dismissed.
- [Zod GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): a newer advisory not in the supplied alert list. The available fix requires moving from Zod 3 to 4.6.6 or later. This application-wide schema migration remains separate; the alert is retained.

Dependabot displays default-branch findings until this PR is merged and GitHub rescans. These changes do not claim that all security alerts are closed or that production images have been rebuilt.
