import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/app-palettes.css', import.meta.url), 'utf8');
function boot(values = {}, systemDark = false, blocked = false) {
  const classes = new Set();
  const root = { classList: { add: name => classes.add(name), remove: (...names) => names.forEach(name => classes.delete(name)) }, dataset: {}, style: {} };
  const storage = new Map(Object.entries(values));
  runInNewContext(script, { localStorage: { getItem(key) { if (blocked) throw Error('Blocked'); return storage.get(key) ?? null; }, setItem(key, value) { if (blocked) throw Error('Blocked'); storage.set(key, value); } }, window: { matchMedia: () => ({ matches: systemDark }) }, document: { documentElement: root } });
  return { classes, root, storage };
}
test('pre-paint preference overrides the system', () => {
  assert(boot({ theme: 'light' }, true).classes.has('light'));
  assert(boot({ theme: 'dark' }).classes.has('dark'));
});
test('system, blocked storage and corrupt data all render safely', () => {
  assert(boot({}, true).classes.has('dark'));
  assert(boot({}, true, true).classes.has('dark'));
  assert(boot({ theme: 'corrupt' }).classes.has('light'));
  assert(boot({ almona_fabricator_ui_preferences: '{' }).classes.has('light'));
});
test('legacy fabricator preference migrates once; global preference wins', () => {
  const legacy = JSON.stringify({ state: { theme: 'dark' } });
  assert.equal(boot({ almona_fabricator_ui_preferences: legacy }).storage.get('theme'), 'dark');
  assert(boot({ theme: 'light', almona_fabricator_ui_preferences: legacy }).classes.has('light'));
});
function rgb(channels) {
  const [h, s, l] = channels.match(/[\d.]+/g).map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  return [0, 8, 4].map(n => { const k = (n + h / 30) % 12; return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); });
}
function luminance(channels) { return rgb(channels).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0); }
for (const selector of [':root, :root.light', ':root.dark']) {
  test(`${selector}: normal text meets WCAG AA contrast`, () => {
    const start = css.indexOf(selector + ' {');
    const block = css.slice(start, css.indexOf('}', start));
    const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+): ([^;]+);/g)].map(m => [m[1], m[2]]));
    for (const [fg, bg] of [['foreground','background'],['card-foreground','card'],['popover-foreground','popover'],['muted-foreground','background'],['muted-foreground','muted'],['primary-foreground','primary'],['accent-foreground','accent'],['brand-foreground','brand'],['destructive-foreground','destructive'],['warning','background'],['success','background'],['info','background']]) {
      const a = luminance(tokens[fg]), b = luminance(tokens[bg]);
      const contrast = (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      assert(contrast >= 4.5, `${fg} on ${bg}: ${contrast.toFixed(2)}:1`);
    }
    for (const fg of ['input', 'ring']) {
      for (const bg of ['background', 'card']) {
        const a = luminance(tokens[fg]), b = luminance(tokens[bg]);
        const contrast = (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        assert(contrast >= 3, `${fg} boundary on ${bg}: ${contrast.toFixed(2)}:1`);
      }
    }
  });
}
