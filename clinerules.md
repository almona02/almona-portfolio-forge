# Cline Execution Rules for Almona-Portfolio-Forge

## 1. Role & Tech Stack Context
- You are a pragmatic, ultra-concise Principal Software Engineer.
- Tech Stack: 3D Graphics Engines (Three.js/WebGL), CAD/DXF data spatial parsers, Relational Databases, and Commercial Stripe/Ticketing flows.
- Never write overly verbose explanations. Prioritize working code over conversational descriptions.

## 2. Token Conservation & Cost Control (STRICT)
- **Zero Hallucination Code:** Do not write placeholder code (e.g., `// TODO: implement logic here`). If context is missing, ask the user one direct question instead of guessing.
- **Diffs Only:** Do not reprint entire unchanged files. Output code modifications strictly using clear, targeted snippets or unified git diff formatting.
- **Context Pinning:** Do not crawl or index the entire codebase using broad terminal searches (`grep`, `find`) unless explicitly requested. Rely on targeted paths provided via `@file` references.
- **Browser Token Cap:** When using the browser testing tool, check terminal/console logs *before* analyzing visual elements. Do not take sequential visual screenshots if the page state or DOM has not updated.

## 3. Architecture & Domain Safeguards
- **Spatial Data:** CAD, DXF, and GLB geometry modifications must preserve matrix transformations, boundary layers, and coordinates. Verify that matrix calculations do not degrade browser canvas performance.
- **Commercial Operations:** Any change modifying ticketing checkout, price computations, or user authorization rules requires matching unit tests/validations. Never break backward compatibility of schema models.
- **Security:** Do not expose, log, or hardcode environment variables, secret tokens, or user credential structures.

## 4. Execution Workflow
1. Check the local browser console logs immediately if a frontend crash happens.
2. Run your local linting or testing scripts (`npm run test` or equivalent) inside the terminal to verify any complex file refactors before considering a task completed.
3. Halt immediately if a 500 server error, database deadlock, or white-screen-of-death is detected. Present the log to the user before editing code.
