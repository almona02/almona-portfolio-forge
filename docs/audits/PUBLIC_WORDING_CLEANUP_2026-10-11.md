# Public wording cleanup

Date: 2026-10-11

## Scope

The owner selected a functionality-preserving cleanup of product branding and prose. The README now describes workshop capabilities without provider promotion and includes guidance for concurrent contributions. Documentation, source comments, interface text, translations, website metadata, and structured descriptions use neutral wording. An unused development tagging dependency was removed from the package manifest and lockfile.

## Preserved technical references

Executable identifiers, import paths, routes, database keys, provider configuration, package names needed by integrations, translation keys, and manufacturing calculations remain intact. Source paths and code examples remain useful for maintenance. Ordinary programming vocabulary, legal notices, supplier documents, and licensed-source provenance identifiers were preserved. This is a wording cleanup, not removal of the underlying support integrations or historical Git records.

Binary supplier documents and images were not modified or certified through visual or text-recognition inspection. Keyword matches in compressed or binary bytes do not establish a visible product reference.

## Validation

- Production frontend build passed; bundle-size and build-option warnings remain.
- Two focused interface test files passed, covering five tests. The initial test attempt failed before execution because the sandbox denied a temporary-cache rename; using a workspace-local temporary directory resolved it.
- Changed Python comments and docstrings were parsed successfully.
- A structural comparison of 234 changed script/source files found no changes to executable structure, identifiers, or numeric values. Twenty translation files retained their keys and non-text values. Seven HTML documents retained executable scripts and styling; structured descriptions changed only text values.
- Diff whitespace checks passed.
- The type-check gate failed on an increased diagnostic count in the unchanged workflow identity test. It reported no new diagnostic signatures. The existing application type errors remain unresolved by this cleanup.

No commit, push, deployment, or Git-history rewrite was performed. The remote public repository changes only after the owner publishes these local edits.
