import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('main list shows threads, bundles, FAB', async ({ page }) => {
  await expect(page.locator('.toolbar .title')).toHaveText('Inbox');
  await expect(page.locator('#screen-list, #stream .thread').first()).toBeVisible();
  await expect(page.getByText('Business trip')).toBeVisible();
  await expect(page.locator('.thread[data-bundle="travel"]')).toBeVisible();
  await expect(page.locator('#fab')).toBeVisible();
  await page.screenshot({ path: 'screenshots/current/list.png' });
});

test('Done removes thread, UNDO restores it', async ({ page }) => {
  const row = page.locator('.thread', { hasText: 'Photography classes' });
  await row.locator('button.done').click();
  await expect(page.locator('#toast')).toContainText('Photography classes');
  await expect(page.locator('.thread', { hasText: 'Photography classes' })).toHaveCount(0);
  await page.locator('#toast button').click();
  await expect(page.locator('.thread', { hasText: 'Photography classes' })).toHaveCount(1);
});

test('snooze sets a future return date', async ({ page }) => {
  await page.locator('.thread', { hasText: 'Photography classes' }).locator('button[title="Snooze"]').click();
  await expect(page.locator('#sheet')).toBeVisible();
  await page.screenshot({ path: 'screenshots/current/snooze.png' });
  await page.locator('#sheetGrid button', { hasText: 'Tomorrow' }).click();
  await expect(page.locator('#toast')).toContainText('Snoozed until');
  await openDrawer(page);
  await page.locator('#drawer button[data-tab="snoozed"]').click();
  await expect(page.locator('.thread', { hasText: 'Photography classes' })).toHaveCount(1);
  await expect(page.locator('.clock').first()).toContainText('Snoozed until');
});

test('pin filter shows only pinned', async ({ page }) => {
  await page.locator('#pinFilter').click();
  await expect(page.locator('#stream .thread')).toHaveCount(1);
  await expect(page.getByText('Business trip')).toBeVisible();
});

test('search filters the stream', async ({ page }) => {
  await page.locator('#searchBtn').click();
  await page.locator('#searchInput').fill('yosemite');
  await expect(page.locator('#stream .thread')).toHaveCount(1);
  await expect(page.getByText('Weekend at Yosemite')).toBeVisible();
});

test('reminder add lands in Reminders tab', async ({ page }) => {
  await page.locator('#fab').click();
  await page.locator('#addReminder').click();
  await page.locator('#remTitle').fill('Water the plants');
  await page.locator('#remGrid button', { hasText: 'Tomorrow' }).click();
  await openDrawer(page);
  await page.locator('#drawer button[data-tab="reminders"]').click();
  await expect(page.locator('.thread', { hasText: 'Water the plants' })).toHaveCount(1);
});

test('bundle opens and sweep clears with undo', async ({ page }) => {
  await page.locator('.thread[data-bundle="travel"]').click({ position: { x: 100, y: 20 } });
  await expect(page.locator('.bundle-head')).toContainText('Travel');
  await page.screenshot({ path: 'screenshots/current/bundle.png' });
  await page.locator('#sweepBtn').click();
  await expect(page.locator('#toast')).toContainText('Swept bundle');
  await page.locator('#toast button').click();
  await expect(page.locator('.thread', { hasText: 'Flight confirmation' })).toHaveCount(1);
});

async function openDrawer(page) {
  if (await page.locator('#drawer button[data-tab="inbox"]').isHidden()) {
    await page.locator('#menuBtn').click();
  }
}
async function swipeRow(page, text, dx) {
  const row = page.locator('.thread .swipe-inner', { hasText: text });
  const box = await row.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, y, { steps: 12 });
  await page.mouse.up();
}

test('swipe right marks done', async ({ page }) => {
  await swipeRow(page, 'Photography classes', 130);
  await expect(page.locator('#toast')).toContainText('Photography classes');
  await expect(page.locator('.thread', { hasText: 'Photography classes' })).toHaveCount(0);
});

test('swipe left opens snooze sheet', async ({ page }) => {
  await swipeRow(page, 'Photography classes', -130);
  await expect(page.locator('#sheet')).toBeVisible();
  await expect(page.locator('#sheetGrid button').first()).toBeVisible();
});

test('swipe right on bundle sweeps it', async ({ page }) => {
  await swipeRow(page, 'Travel', 130);
  await expect(page.locator('#toast')).toContainText('Swept bundle');
  await expect(page.locator('.thread[data-bundle="travel"]')).toHaveCount(0);
});

test('short drag snaps back without action', async ({ page }) => {
  await swipeRow(page, 'Photography classes', 40);
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('.thread', { hasText: 'Photography classes' })).toHaveCount(1);
});

test('done state persists across reload', async ({ page }) => {
  await page.locator('.thread', { hasText: 'Photography classes' }).locator('button.done').click();
  await openDrawer(page);
  await page.locator('#drawer button[data-tab="done"]').click();
  await expect(page.locator('.thread', { hasText: 'Photography classes' })).toHaveCount(1);
  await page.reload();
  await openDrawer(page);
  await page.locator('#drawer button[data-tab="done"]').click();
  await expect(page.locator('.thread', { hasText: 'Photography classes' })).toHaveCount(1);
});
