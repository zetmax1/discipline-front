import type { ReactNode } from 'react';
import { ThemeProvider as NextThemes } from 'next-themes';
import { useFeature } from '@/hooks/use-features';

/** Light / dark / system theme via the `.dark` design tokens. Forced light while F12A is off. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const enabled = useFeature('F12A');
  return (
    <NextThemes
      attribute="class"
      storageKey="theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={enabled ? undefined : 'light'}
    >
      {children}
    </NextThemes>
  );
}
