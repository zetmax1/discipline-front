import { useI18n, type Params, type TKey } from '@/i18n';

/** Translated text for places that can't call useI18n() themselves (e.g. UI primitives). */
export function T({ k, params }: { k: TKey; params?: Params }) {
  const { t } = useI18n();
  return <>{t(k, params)}</>;
}
