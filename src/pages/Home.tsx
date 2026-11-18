import { useFeature } from '@/hooks/use-features';
import Dashboard from './Dashboard';
import Today from './Today';

/** "/" — the Today screen once F1 is on, the Dashboard before. */
export default function Home() {
  return useFeature('F1') ? <Today /> : <Dashboard />;
}
