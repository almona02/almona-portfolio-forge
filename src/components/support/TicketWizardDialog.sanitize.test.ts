import DOMPurify from 'dompurify';
import { describe, expect, it } from 'vitest';

// Mirrors the sanitizer wiring in TicketWizardDialog.tsx (USE_PROFILES.html).
const sanitize = (html: string): string =>
  DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

describe('DOMPurify malicious-markup regression (3.4.17)', () => {
  it('keeps safe markup', () => {
    const out = sanitize('<p>hello <strong>world</strong></p>');
    expect(out).toContain('<strong>world</strong>');
  });

  it('strips <script> payloads', () => {
    const out = sanitize('<p>hi</p><script>alert("xss")</script>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('alert("xss")');
  });

  it('strips inline event handlers', () => {
    const out = sanitize('<img src="x.png" onerror="alert(1)">');
    expect(out).not.toContain('onerror');
  });

  it('strips javascript: URLs', () => {
    const out = sanitize('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
  });
});
