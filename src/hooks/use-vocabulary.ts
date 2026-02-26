import { useLocalStorage } from './use-local-storage';
import { VocabularyWord } from '@/lib/types';
import { VOCABULARY_WORDS } from '@/lib/static-data';

export function useVocabulary() {
  const [words, setWords] = useLocalStorage<VocabularyWord[]>('app-vocabulary', VOCABULARY_WORDS);

  const today = new Date().toISOString().split('T')[0];
  const todayWords = words.filter(w => w.date === today);

  const toggleLearned = (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, learned: !w.learned } : w));
  };

  const toggleSaved = (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, saved: !w.saved } : w));
  };

  return { words, todayWords, toggleLearned, toggleSaved };
}
