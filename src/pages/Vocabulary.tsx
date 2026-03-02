import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useVocabulary } from '@/hooks/use-vocabulary';

type VocabFilter = 'all' | 'saved' | 'english' | 'russian';

export default function Vocabulary() {
  const [filter, setFilter] = useState<VocabFilter>('all');
  const [page, setPage] = useState(1);

  // Map filter to API lang param
  const langParam = filter === 'english' || filter === 'russian' ? filter : undefined;

  const { todayWords, words, toggleLearned, toggleSaved, total, currentPage, totalPages, isLoading } = useVocabulary(
    langParam,
    page,
    30
  );

  // Client-side filter for "saved" (since it's not a backend query param)
  const filteredWords = filter === 'saved' ? words.filter(w => w.saved) : words;

  const handleFilterChange = (f: VocabFilter) => {
    setFilter(f);
    setPage(1);
  };

  const filters: { key: VocabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'saved', label: '⭐ Saved' },
    { key: 'english', label: '🇬🇧 English' },
    { key: 'russian', label: '🇷🇺 Russian' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Vocabulary</h1>
      </div>

      {/* Today's Words */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Today</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {todayWords.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2">No words for today yet.</p>
          )}
          {todayWords.map(word => (
            <Card key={word.id} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{word.word}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {word.partOfSpeech && (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {word.partOfSpeech}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {word.language === 'russian' ? 'Russian A2+' : 'English C1'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{word.definition}</p>
                {word.example && (
                  <p className="text-sm italic text-muted-foreground">"{word.example}"</p>
                )}
                {word.synonym && (
                  <p className="text-xs text-muted-foreground">Synonym: <span className="font-medium">{word.synonym}</span></p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={word.learned ? 'default' : 'outline'}
                    className="text-xs h-8"
                    onClick={() => toggleLearned(word.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {word.learned ? 'Learned' : 'Mark learned'}
                  </Button>
                  <Button
                    size="sm"
                    variant={word.saved ? 'secondary' : 'outline'}
                    className="text-xs h-8"
                    onClick={() => toggleSaved(word.id)}
                  >
                    {word.saved ? <BookmarkCheck className="h-3.5 w-3.5 mr-1" /> : <Bookmark className="h-3.5 w-3.5 mr-1" />}
                    {word.saved ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* All Words with Filter + Pagination */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">All Words</h2>
          <div className="flex gap-1">
            {filters.map(f => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                className="text-xs h-7 px-3"
                onClick={() => handleFilterChange(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

        <div className="space-y-2">
          {filteredWords.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">
              {filter === 'saved' ? 'No saved words yet. Save words to see them here.' : 'No words found.'}
            </p>
          )}
          {filteredWords.map(word => (
            <div key={word.id} className="flex items-center gap-3 p-3 border rounded-md text-sm group hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{word.word}</span>
                  {word.partOfSpeech && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {word.partOfSpeech}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{word.definition}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{word.date}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{word.language === 'russian' ? 'RU' : 'EN'}</Badge>
              {word.learned && <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 shrink-0"
                onClick={() => toggleSaved(word.id)}
                title={word.saved ? 'Unsave' : 'Save'}
              >
                {word.saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {total} words total · Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3"
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Powered by Free Dictionary API · Wiktionary (CC BY-SA)
      </p>
    </div>
  );
}
