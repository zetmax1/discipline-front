import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, isAuthenticated } from '@/lib/api';
import { VocabularyWord } from '@/lib/types';
import { useLocalStorage } from './use-local-storage';
import { VOCABULARY_WORDS } from '@/lib/static-data';
import { localDateString } from '@/lib/dates';

interface VocabResponse {
  words: VocabularyWord[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface WordResponse {
  word: VocabularyWord;
}

export function useVocabulary(lang?: string, page = 1, pageSize = 30) {
  const queryClient = useQueryClient();
  const loggedIn = isAuthenticated();
  const today = localDateString();

  // Fallback to localStorage when not logged in
  const [localWords, setLocalWords] = useLocalStorage<VocabularyWord[]>('app-vocabulary', VOCABULARY_WORDS);

  // Today's words query
  const { data: todayData, isLoading: todayLoading } = useQuery<{ words: VocabularyWord[]; count: number }>({
    queryKey: ['vocabulary', 'today'],
    queryFn: () => apiGet('/vocabulary/today'),
    enabled: loggedIn,
    staleTime: 12 * 60 * 60 * 1000,
  });

  // Paginated all words query
  const langParam = lang ? `&lang=${lang}` : '';
  const { data: allData, isLoading: allLoading } = useQuery<VocabResponse>({
    queryKey: ['vocabulary', 'all', lang, page, pageSize],
    queryFn: () => apiGet(`/vocabulary?page=${page}&pageSize=${pageSize}${langParam}`),
    enabled: loggedIn,
  });

  const todayWords = loggedIn
    ? (todayData?.words ?? [])
    : localWords.filter(w => w.date === today);

  // Apply language filter client-side for localStorage fallback
  const allWords = loggedIn
    ? (allData?.words ?? [])
    : lang
      ? localWords.filter(w => w.language === lang)
      : localWords;

  // Mutations
  const learnedMutation = useMutation({
    mutationFn: (id: number | string) => apiPut<WordResponse>(`/vocabulary/${id}/learned`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const savedMutation = useMutation({
    mutationFn: (id: number | string) => apiPut<WordResponse>(`/vocabulary/${id}/saved`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const toggleLearned = (id: string | number) => {
    if (loggedIn) {
      learnedMutation.mutate(id);
    } else {
      setLocalWords(prev => prev.map(w => w.id === String(id) ? { ...w, learned: !w.learned } : w));
    }
  };

  const toggleSaved = (id: string | number) => {
    if (loggedIn) {
      savedMutation.mutate(id);
    } else {
      setLocalWords(prev => prev.map(w => w.id === String(id) ? { ...w, saved: !w.saved } : w));
    }
  };

  return {
    words: allWords,
    todayWords,
    toggleLearned,
    toggleSaved,
    isLoading: loggedIn ? (todayLoading || allLoading) : false,
    // Pagination
    total: allData?.total ?? localWords.length,
    currentPage: allData?.page ?? 1,
    totalPages: allData?.totalPages ?? 1,
  };
}
