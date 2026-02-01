# Contributing to ALMONA 12-Week Execution Blueprint Implementation

**Date:** January 2026  
**Purpose:** Guide for contributors implementing the 12-week execution blueprint  
**Audience:** Engineers, Designers, QA Engineers

---

## Overview

This document provides guidelines for contributing to the ALMONA 12-Week Execution Blueprint implementation. It includes Definition of Ready (DOR), Definition of Done (DOE), PR checklists, testing gates, and quality standards.

---

## Definition of Ready (DOR)

A task/story is considered **Ready** when it meets the following criteria:

### Phase 1: Visual Polish & Design System
- [ ] Specification artifact exists and is approved
- [ ] Design tokens/design system specs reviewed
- [ ] Acceptance criteria clearly defined
- [ ] Dependencies identified and resolved
- [ ] Performance budgets defined
- [ ] Accessibility requirements specified

### Phase 2: Keyboard Shortcuts & Accessibility
- [ ] KEYBOARD_SHORTCUTS.md specification reviewed
- [ ] ShortcutArchitecture.md reviewed
- [ ] Platform requirements clear (Windows/macOS)
- [ ] Text input safety requirements understood
- [ ] Test matrix available

### Phase 3: Enterprise Features
- [ ] Service/UI specification reviewed
- [ ] TypeScript interfaces defined
- [ ] Performance targets specified
- [ ] Security considerations documented
- [ ] Integration points identified

### Phase 4: Reporting & Analytics
- [ ] Reporting/Analytics specification reviewed
- [ ] Schema/template definitions clear
- [ ] Performance SLAs defined (< 2s PDF generation)
- [ ] Export format requirements clear
- [ ] Security/RBAC requirements specified

### Phase 5: Mobile Optimization
- [ ] MobileOptimizationChecklist.md reviewed
- [ ] WorkshopPortalSpec.md reviewed
- [ ] Device requirements clear (iOS/Android/Tablet)
- [ ] Performance budgets defined (< 2s on 4G)
- [ ] Offline/PWA requirements clear

---

## Definition of Done (DOE)

A task/story is considered **Done** when it meets ALL of the following criteria:

### Code Quality
- [ ] Code passes linting (`npm run lint`)
- [ ] Code passes type checking (`npm run type-check` or `tsc --noEmit`)
- [ ] No syntax errors (Python, TypeScript, JavaScript)
- [ ] Code follows project style guide
- [ ] Code is properly formatted (Prettier/ESLint)
- [ ] No console errors or warnings (development)

### Testing
- [ ] Unit tests written and passing (where applicable)
- [ ] Integration tests written and passing (where applicable)
- [ ] E2E tests written and passing (for critical flows)
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing completed (iOS, Android - Phase 5)
- [ ] Accessibility testing completed (keyboard nav, screen reader)
- [ ] Test coverage meets minimum requirements (70%+ for new code)

### Performance
- [ ] Performance budgets met (bundle size, TTI, LCP)
- [ ] No performance regressions (Lighthouse scores maintained/improved)
- [ ] Animations smooth (60fps on mid-range hardware)
- [ ] Large dataset handling verified (virtualization, pagination)
- [ ] Memory leaks checked (no memory leaks in profiling)

### Security
- [ ] Input sanitization implemented (where applicable)
- [ ] XSS prevention verified
- [ ] CSRF protection verified (where applicable)
- [ ] RBAC checks implemented (where applicable)
- [ ] Sensitive data not exposed
- [ ] Environment variables used (no hardcoded secrets)

### Accessibility
- [ ] WCAG 2.1 AA compliance verified
- [ ] Keyboard navigation working
- [ ] Focus rings visible and appropriate
- [ ] ARIA roles and labels added (where applicable)
- [ ] Color contrast ratios met (4.5:1 for normal text, 3:1 for large text)
- [ ] Screen reader testing completed (where applicable)

### Documentation
- [ ] Code comments added (complex logic)
- [ ] README updated (if new features/components)
- [ ] CHANGELOG updated (if user-facing changes)
- [ ] API documentation updated (if API changes)
- [ ] TypeScript types/JSDoc added (public APIs)

### Review
- [ ] Code review approved (minimum 1 approver)
- [ ] Design review approved (if UI changes)
- [ ] QA sign-off (if required)
- [ ] Product/Stakeholder sign-off (if required)

### Integration
- [ ] Feature works in development environment
- [ ] Feature works in staging environment
- [ ] No breaking changes (or breaking changes documented)
- [ ] Backward compatibility maintained (where applicable)
- [ ] Migration scripts provided (if database changes)

---

## Pull Request Checklist

### Before Creating PR
- [ ] Code follows DOR criteria
- [ ] Branch name follows convention: `feature/phase-X-description` or `fix/description`
- [ ] Commits are atomic and well-described
- [ ] No merge conflicts with main/master

### PR Description Template
```markdown
## Description
Brief description of changes

## Related Phase/Epic
Phase X: [Phase Name]

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Cross-browser testing completed
- [ ] Mobile testing completed (if applicable)

## Performance Impact
- Bundle size: [before] → [after]
- Lighthouse score: [before] → [after]
- Performance budgets: [met/not met]

## Screenshots/Recordings
[If UI changes, include screenshots or recordings]

## Checklist
- [ ] Code passes linting
- [ ] Code passes type checking
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Performance budgets met
- [ ] Accessibility verified
```

### PR Review Requirements
- [ ] Minimum 1 approver (2 for critical changes)
- [ ] All CI checks passing
- [ ] Code review comments addressed
- [ ] Design review (if UI changes)
- [ ] QA review (if required)

---

## Testing Gates

### Unit Testing
**Required for:**
- Utility functions
- Hooks
- Service functions
- Helper functions

**Coverage:** Minimum 70% for new code

**Tools:** Jest, Vitest, or project testing framework

### Integration Testing
**Required for:**
- Component integration
- Service integration
- API integration
- Workflow testing

**Coverage:** Critical paths must be covered

**Tools:** Testing Library, Playwright, or project testing framework

### E2E Testing
**Required for:**
- Critical user flows
- Multi-step workflows
- Cross-browser compatibility

**Coverage:** At least critical user journeys

**Tools:** Playwright, Cypress, or project E2E framework

### Performance Testing
**Required for:**
- New features affecting performance
- Large dataset handling
- Animation performance
- Bundle size impact

**Tools:** Lighthouse, Chrome DevTools Profiler, Bundle Analyzer

### Accessibility Testing
**Required for:**
- All UI components
- Forms and inputs
- Navigation
- Modals and dialogs

**Tools:** axe DevTools, WAVE, Keyboard navigation, Screen readers

### Cross-Browser Testing
**Required for:**
- All UI changes
- All new features
- Critical user flows

**Browsers:** Chrome, Firefox, Safari, Edge (latest versions)

### Mobile Testing (Phase 5)
**Required for:**
- Mobile-optimized features
- Workshop portal
- Touch interactions

**Devices:** iOS (Safari), Android (Chrome), Tablet (both)

---

## Code Quality Standards

### TypeScript/JavaScript
- **Strict mode:** Enable TypeScript strict mode
- **Type safety:** No `any` types (use `unknown` if needed)
- **Error handling:** Comprehensive error handling
- **Async/await:** Prefer async/await over Promises
- **Imports:** Use absolute imports where configured
- **Exports:** Named exports preferred

### React/Components
- **Functional components:** Use functional components with hooks
- **Memoization:** Use React.memo, useMemo, useCallback appropriately
- **Props:** Type all props with TypeScript interfaces
- **State:** Use appropriate state management (useState, Context, etc.)
- **Effects:** Cleanup in useEffect (return cleanup function)
- **Keys:** Proper keys in lists (stable, unique)

### Performance
- **Bundle size:** Monitor and optimize bundle size
- **Code splitting:** Use lazy loading for heavy components
- **Virtualization:** Use for large lists (> 100 items)
- **Memoization:** Memoize expensive computations
- **Animations:** Use transform/opacity only (GPU-accelerated)

### Security
- **Input validation:** Validate and sanitize all inputs
- **XSS prevention:** Use React's built-in XSS protection
- **CSRF:** Implement CSRF tokens where needed
- **RBAC:** Check permissions before operations
- **Secrets:** Use environment variables, never hardcode

### Accessibility
- **Semantic HTML:** Use appropriate HTML elements
- **ARIA:** Add ARIA attributes where needed
- **Keyboard:** Full keyboard navigation support
- **Focus:** Visible focus indicators
- **Contrast:** WCAG AA color contrast ratios

---

## Git Workflow

### Branch Naming
- `feature/phase-X-description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Refactoring
- `docs/description` - Documentation
- `test/description` - Test additions

### Commit Messages
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation
- `test:` Tests
- `chore:` Maintenance
- `perf:` Performance improvement
- `style:` Code style changes

Example: `feat(phase-2): implement KeyboardShortcutsModal component`

### PR Process
1. Create feature branch from `main`/`master`
2. Make changes, commit with descriptive messages
3. Push branch and create PR
4. Address review comments
5. Ensure all checks pass
6. Merge after approval (squash merge preferred)

---

## Phase-Specific Guidelines

### Phase 1: Design System
- **Design tokens:** Use design-system/tokens/ colors.json and typography.json
- **Component states:** Follow ComponentStates.md specifications
- **Spacing:** Use 4px base spacing system
- **Performance:** Monitor bundle size impact
- **Accessibility:** Verify WCAG AA compliance

### Phase 2: Keyboard Shortcuts
- **Platform awareness:** Handle Ctrl (Windows/Linux) vs Cmd (macOS)
- **Text input safety:** Never override native input behavior
- **Scope management:** Respect global/workspace/modal scopes
- **Testing:** Execute KeyboardShortcutTestMatrix.csv
- **Documentation:** Update KEYBOARD_SHORTCUTS.md if shortcuts change

### Phase 3: Enterprise Features
- **Service contracts:** Follow TypeScript interfaces in specs
- **Performance:** Implement pagination, debouncing, caching
- **Error handling:** Comprehensive error handling and user feedback
- **Security:** RBAC checks, input validation
- **Testing:** Unit tests for services, integration tests for workflows

### Phase 4: Reporting & Analytics
- **Performance:** PDF generation < 2s (typical), use background jobs for large reports
- **Schema validation:** Validate report templates against schema
- **Export formats:** Support PDF, Excel, CSV
- **Security:** RBAC, data privacy, audit logging
- **Testing:** Performance testing, export format testing

### Phase 5: Mobile Optimization
- **Performance:** Load < 2s on 4G, 60fps animations
- **Touch gestures:** Implement pinch-zoom, swipe, long-press
- **Hit targets:** Minimum 44x44px
- **Offline:** PWA support, offline mode
- **Testing:** Device testing (iOS/Android/Tablet)

---

## Quality Gates

### Pre-Commit
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] No console errors
- [ ] Tests pass locally

### Pre-PR
- [ ] All pre-commit checks pass
- [ ] Branch is up to date with main/master
- [ ] PR description filled out
- [ ] Tests added/updated
- [ ] Documentation updated

### Pre-Merge
- [ ] Code review approved
- [ ] All CI checks passing
- [ ] Design review (if UI changes)
- [ ] QA sign-off (if required)
- [ ] Performance budgets met
- [ ] Accessibility verified

---

## Getting Help

### Questions
- **Technical questions:** Ask in team chat or engineering channel
- **Specification questions:** Review specs/ directory, ask specification owner
- **Process questions:** Ask engineering lead or project manager

### Resources
- **Blueprint:** ALMONA_12_WEEK_EXECUTION_BLUEPRINT.md
- **Specifications:** specs/ directory
- **Design System:** design-system/ directory
- **QA Templates:** qa/ directory
- **Status:** docs/12_WEEK_BLUEPRINT_STATUS_ANALYSIS.md

---

## Code Review Guidelines

### For Authors
- Keep PRs focused and small (< 500 lines if possible)
- Provide context in PR description
- Respond to review comments promptly
- Be open to feedback and suggestions

### For Reviewers
- Review within 24 hours (if possible)
- Be constructive and respectful
- Focus on code quality, not personal preferences
- Ask questions if something is unclear
- Approve when criteria are met

### Review Focus Areas
- **Correctness:** Does it work as intended?
- **Performance:** Any performance concerns?
- **Security:** Any security vulnerabilities?
- **Accessibility:** Accessibility requirements met?
- **Testing:** Adequate test coverage?
- **Documentation:** Documentation updated?
- **Code quality:** Follows standards and best practices?

---

## Common Pitfalls to Avoid

1. **Skipping tests:** Always write tests for new code
2. **Ignoring performance:** Monitor bundle size and performance impact
3. **Accessibility last:** Build accessibility in from the start
4. **Large PRs:** Keep PRs focused and reviewable
5. **Breaking changes:** Document and communicate breaking changes
6. **Hardcoded values:** Use configuration and environment variables
7. **No error handling:** Always handle errors appropriately
8. **Missing documentation:** Update docs with code changes

---

## Continuous Improvement

### Retrospectives
- Weekly team retrospectives
- Phase completion retrospectives
- Process improvement discussions

### Feedback
- Provide feedback on this contributing guide
- Suggest improvements to processes
- Share learnings and best practices

---

**Last Updated:** January 2026  
**Owner:** Engineering Lead  
**Review Frequency:** Per phase or as needed
