import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, BookmarkCheck, CheckCircle2 } from 'lucide-react';
import { useVocabulary } from '@/hooks/use-vocabulary';

export default function Vocabulary() {
  const { words, todayWords, toggleLearned, toggleSaved } = useVocabulary();
  const pastWords = words.filter(w => !todayWords.includes(w));

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Vocabulary</h1>

      {/* Today's Words */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Today</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {todayWords.map(word => (
            <Card key={word.id} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{word.word}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {word.language === 'russian' ? 'Russian B1–B2' : 'English C1'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{word.definition}</p>
                <p className="text-sm italic text-muted-foreground">"{word.example}"</p>
                {word.synonym && (
                  <p className="text-xs text-muted-foreground">Synonym: <span className="font-medium">{word.synonym}</span></p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant={word.learned ? 'default' : 'outline'} className="text-xs h-8" onClick={() => toggleLearned(word.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {word.learned ? 'Learned' : 'Mark learned'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => toggleSaved(word.id)}>
                    {word.saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Past Words */}
      {pastWords.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Past Words</h2>
          <div className="space-y-2">
            {pastWords.map(word => (
              <div key={word.id} className="flex items-center gap-3 p-3 border rounded-md text-sm">
                <span className="font-semibold flex-1">{word.word}</span>
                <span className="text-xs text-muted-foreground">{word.definition.substring(0, 40)}...</span>
                <Badge variant="outline" className="text-[10px]">{word.language === 'russian' ? 'RU' : 'EN'}</Badge>
                {word.learned && <CheckCircle2 className="h-3.5 w-3.5 text-accent" />}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleSaved(word.id)}>
                  {word.saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
