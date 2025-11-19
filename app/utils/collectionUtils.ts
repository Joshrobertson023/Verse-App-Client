import { CollectionNote, UserVerse } from '../store';

/**
 * Builds a verse order string from userVerses and collection notes.
 * The order is: verse references (comma-separated) followed by note IDs (comma-separated).
 * 
 * @param verses - Array of UserVerse objects
 * @param notes - Array of CollectionNote objects
 * @returns Comma-separated string of verse references and note IDs
 */
export function buildVerseOrderString(verses: UserVerse[], notes: CollectionNote[]): string {
  const verseRefs = verses
    .map((uv) => uv.readableReference?.trim())
    .filter((ref): ref is string => Boolean(ref && ref.length > 0));
  const noteIds = notes.map((n) => n.id);
  return [...verseRefs, ...noteIds].join(',');
}

/**
 * Builds a verse order string from userVerses only (for backwards compatibility).
 * 
 * @param verses - Array of UserVerse objects
 * @returns Comma-separated string of verse references
 */
export function buildVerseOrderStringFromVerses(verses: UserVerse[]): string {
  const verseRefs = verses
    .map((uv) => uv.readableReference?.trim())
    .filter((ref): ref is string => Boolean(ref && ref.length > 0));
  return verseRefs.join(',');
}










