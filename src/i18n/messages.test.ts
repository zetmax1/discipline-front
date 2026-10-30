import { describe, it, expect } from 'vitest';
import { en } from './en';
import { uz } from './uz';
import { ru } from './ru';
import { INTL_LOCALE, LOCALES, type Locale } from './locales';

const dictionaries: Record<Locale, Record<string, string>> = { en, uz, ru };
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Keys without plural suffix, plus the plural bases (`planner.blocks` for `planner.blocks_one` …). */
function shape(dict: Record<string, string>) {
  const plain = new Set<string>();
  const plural = new Set<string>();
  for (const key of Object.keys(dict)) {
    if (PLURAL_SUFFIX.test(key)) plural.add(key.replace(PLURAL_SUFFIX, ''));
    else plain.add(key);
  }
  return { plain, plural };
}

describe('dictionaries', () => {
  const base = shape(en);

  it.each(LOCALES)('%s has exactly the keys of en', (locale) => {
    const { plain, plural } = shape(dictionaries[locale]);
    expect([...plain].sort()).toEqual([...base.plain].sort());
    expect([...plural].sort()).toEqual([...base.plural].sort());
  });

  it.each(LOCALES)('%s has every plural form its language needs', (locale) => {
    const categories = new Intl.PluralRules(INTL_LOCALE[locale]).resolvedOptions().pluralCategories;
    for (const key of base.plural) {
      for (const cat of categories) {
        expect(dictionaries[locale], `${locale}: ${key}_${cat}`).toHaveProperty(`${key}_${cat}`);
      }
    }
  });

  it.each(LOCALES)('%s has no empty text and the same {params} as en', (locale) => {
    const dict = dictionaries[locale];
    for (const [key, text] of Object.entries(dict)) {
      expect(text.trim(), `${locale}: ${key} is empty`).not.toBe('');
      const enText = en[key as keyof typeof en] ?? en[`${key.replace(PLURAL_SUFFIX, '')}_other` as keyof typeof en];
      expect(params(text), `${locale}: ${key} params`).toEqual(params(enText));
    }
  });

  it('has a translation for every API error code', async () => {
    const { ERROR_CODES } = await import('@/contracts/errors');
    for (const code of ERROR_CODES) expect(en).toHaveProperty(`errors.${code}`);
  });
});
