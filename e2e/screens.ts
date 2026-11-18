import type { Page, TestInfo } from '@playwright/test';
import { join } from 'node:path';

/** Saves a screenshot of what the screen shows to $E2E_SCREENSHOTS/<project>-<name>.png when that variable is set. */
export async function screen(page: Page, info: TestInfo, name: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (!dir) return;
  await page.screenshot({ path: join(dir, `${info.project.name}-${name}.png`), fullPage: false });
}
