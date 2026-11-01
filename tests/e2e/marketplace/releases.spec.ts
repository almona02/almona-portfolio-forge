import { expect, test } from '@playwright/test';
import { startReleaseFixture } from './releaseFixture';

test('returning mobile browser survives two releases without reloading another unsaved tab', async ({ context, page }) => {
  const fixture = await startReleaseFixture();
  try {
    await page.goto(fixture.origin);
    await expect(page.locator('#worker')).toHaveText('Worker ready');
    await page.reload();
    const workspace = await context.newPage();
    await workspace.goto(`${fixture.origin}/fabricator/studio`);
    await workspace.getByLabel('Workspace draft').fill('Unsaved fabrication work');
    let workspaceNavigations = 0;
    workspace.on('framenavigated', frame => { if (frame === workspace.mainFrame()) workspaceNavigations++; });
    await fixture.publish();
    await page.goto(`${fixture.origin}/used-machines`);
    await expect(page.locator('#listings')).toHaveText('6 machines in release A');
    await expect(page.locator('#worker')).toHaveText('Update waiting');
    await page.getByRole('button', { name: 'Recover failed page' }).click();
    await expect(page.locator('#result')).toHaveText('Recovery finished');
    await expect(workspace.getByLabel('Workspace draft')).toHaveValue('Unsaved fabrication work');
    expect(workspaceNavigations).toBe(0);
    await expect(page.locator('#worker')).toHaveText('Update waiting');
    await workspace.close();
    await page.getByRole('button', { name: 'Activate update' }).click();
    await expect(page.locator('#release')).toHaveText('Release B');
    await expect(page.locator('#listings')).toHaveText('6 machines in release B');
    await fixture.bumpDocument();
    await page.reload();
    await expect(page.locator('#document')).toHaveText('Fresh document B');
    await page.screenshot({ path: test.info().outputPath('returning-browser.png'), fullPage: true });
  } finally { await fixture.close(); }
});

test('persistent chunk failure stops after one guarded reload', async ({ page }) => {
  const fixture = await startReleaseFixture();
  try {
    await fixture.publish(); fixture.failChunks();
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await page.goto(`${fixture.origin}/used-machines`);
    await expect(page.locator('#error')).toHaveText('Could not load listings');
    expect(navigations).toBeLessThanOrEqual(2);
    expect(navigations).toBeGreaterThanOrEqual(1);
  } finally { await fixture.close(); }
});
