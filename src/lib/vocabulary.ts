/**
 * The server returns an unsaved fallback word (id 0) when the dictionary lookup
 * fails; it can't be marked learned or saved until a later request stores it.
 */
export function isStoredWord(word: { id: string | number }): boolean {
  return word.id !== 0 && word.id !== '';
}
