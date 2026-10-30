import { expect, type Page } from '@playwright/test';

/** Every visible control on a phone is at least 44×44 px (a checkbox counts through its label row). */
export async function expectTouchTargets(page: Page, where = '') {
  const small = await page.evaluate(() => {
    const selector = 'button, a[href], select, input:not([type="hidden"]), [role="button"], [role="combobox"], label:has([role="checkbox"])';
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter(el => el.getAttribute('role') !== 'checkbox')
      .filter(el => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden')
      .filter(el => !el.closest('[aria-hidden="true"], [data-sidebar="rail"]'))
      .map(el => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.height < 43.5 || box.width < 43.5)
      .map(({ el, box }) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(box.width)}×${Math.round(box.height)}`);
  });
  expect(small, `controls smaller than 44×44 px ${where}`).toEqual([]);
}

/** Nothing sticks out sideways: no element is wider than the screen or past its right edge. */
export async function expectNoSidewaysOverflow(page: Page, where = '') {
  const wide = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll<HTMLElement>('main *, nav *')]
      .filter(el => el.offsetParent !== null)
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.right > vw + 1)
      .slice(0, 5)
      .map(({ el, r }) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)} > ${vw}`);
  });
  expect(wide, `elements past the right edge ${where}`).toEqual([]);
}
