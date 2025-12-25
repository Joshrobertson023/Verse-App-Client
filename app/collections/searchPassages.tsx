import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserCollections, getUserVersesPopulated, getVerseSearchResult } from '../db';
import { Collection, SearchData, UserVerse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface SearchResult {
  userVerse: UserVerse;
  collection: Collection;
}

export default function SearchPassagesScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const { query } = useLocalSearchParams<{ query: string }>();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Set header title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: query ? `Results for ${query}` : 'Search Results',
      headerStyle: {
        backgroundColor: theme.colors.background,
      },
      headerTintColor: theme.colors.onBackground,
    });
  }, [navigation, query, theme.colors.background, theme.colors.onBackground]);

  useEffect(() => {
    const performSearch = async () => {
      if (!query || !query.trim() || !user?.username) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Use getVerseSearchResult - backend now handles book, chapter, and reference searches
        let searchData: SearchData;
        try {
          searchData = await getVerseSearchResult(query.trim());
        } catch (e) {
          console.error('Failed to parse reference:', e);
          setSearchResults([]);
          setLoading(false);
          return;
        }

        // Determine search type: book-only, chapter-only, or specific references
        // Book-only search: readable_Reference is just the book name (no colon, single word)
        const isBookOnlySearch = searchData.readable_Reference && 
                                 !searchData.readable_Reference.includes(':') &&
                                 searchData.readable_Reference.trim().split(/\s+/).length === 1;
        
        // Extract all verse references from search result
        const searchVerseReferences = new Set<string>();
        let searchBookName: string | null = null;
        
        // Add individual verse references from search results
        if (searchData.verses && searchData.verses.length > 0) {
          searchData.verses.forEach(verse => {
            if (verse.verse_reference) {
              searchVerseReferences.add(verse.verse_reference.trim().toLowerCase());
              
              // Extract book name from first verse for book-only matching
              if (!searchBookName) {
                const refParts = verse.verse_reference.split(':');
                if (refParts.length > 0) {
                  const bookChapterPart = refParts[0].trim();
                  // Match "Book Chapter" format (e.g., "Psalms 119")
                  const chapterMatch = bookChapterPart.match(/^(.+?)\s+\d+$/);
                  if (chapterMatch) {
                    searchBookName = chapterMatch[1].trim().toLowerCase();
                  } else {
                    // Just book name (shouldn't happen but handle it)
                    searchBookName = bookChapterPart.toLowerCase();
                  }
                }
              }
            }
          });
        }

        // If it's a book-only search, prioritize the readable reference as the book name
        // (it's more accurate since it's the normalized book name from the backend)
        if (isBookOnlySearch && searchData.readable_Reference) {
          searchBookName = searchData.readable_Reference.trim().toLowerCase();
        }

        // If we have a readable reference (for passages), add it too
        if (searchData.readable_Reference && !isBookOnlySearch) {
          searchVerseReferences.add(searchData.readable_Reference.trim().toLowerCase());
        }

        if (searchVerseReferences.size === 0 && !searchBookName) {
          setSearchResults([]);
          setLoading(false);
          return;
        }

        // Get all collections with populated verses
        const allCollections = await getUserCollections(user.username);
        const results: SearchResult[] = [];

        // Search through each collection
        for (const collection of allCollections) {
          if (!collection.userVerses || collection.userVerses.length === 0) {
            continue;
          }

          // Populate verses if needed
          let populatedCollection = collection;
          if (collection.userVerses.some(uv => !uv.verses || uv.verses.length === 0)) {
            try {
              populatedCollection = await getUserVersesPopulated(collection);
            } catch (e) {
              console.error('Failed to populate collection:', e);
              continue;
            }
          }

          // Search through userVerses in this collection
          for (const userVerse of populatedCollection.userVerses || []) {
            const userVerseRef = userVerse.readableReference?.trim().toLowerCase();
            
            if (!userVerseRef) continue;
            
            let matches = false;

            if (isBookOnlySearch && searchBookName) {
              // Book-only search: match if reference starts with the book name
              matches = userVerseRef.startsWith(searchBookName + ' ');
            } else {
              // Chapter or reference search: match exact or if the userVerse reference starts with the search reference
              // (to handle ranges like "Psalms 119:2-5" matching "Psalms 119:2")
              for (const searchRef of searchVerseReferences) {
                if (userVerseRef === searchRef || 
                    userVerseRef.startsWith(searchRef + '-') || 
                    userVerseRef.startsWith(searchRef + ',')) {
                  matches = true;
                  break;
                }
              }
            }
            
            if (matches) {
              results.push({
                userVerse,
                collection: populatedCollection
              });
            }
          }
        }

        setSearchResults(results);
      } catch (error) {
        console.error('Failed to search passages:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query, user?.username]);

  const handleCollectionPress = (collection: Collection) => {
    router.push(`/collections/${collection.collectionId}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : searchResults.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ ...styles.text, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
            No passages found
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 100
          }}
        >
          {searchResults.map((result, index) => (
            <View key={`${result.collection.collectionId}-${result.userVerse.readableReference}-${index}`} style={{ minWidth: '100%', marginBottom: 20 }}>
              <View style={{ minWidth: '100%', borderRadius: 3 }}>
                {/* Passage - same style as collections page, not clickable */}
                <View>
                  <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600 }}>
                    {result.userVerse.readableReference || 'Unknown Reference'}
                  </Text>
                  {(result.userVerse.verses || []).map((verse, verseIndex) => (
                    <View key={verse.verse_reference || `${result.userVerse.readableReference}-verse-${verseIndex}`} style={{}}>
                      <View>
                        <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 18 }}>
                          {verse.verse_Number}: {verse.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Collection - clickable with chevron */}
                <TouchableOpacity
                  onPress={() => handleCollectionPress(result.collection)}
                  style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="folder-outline" size={18} color={theme.colors.primary} />
                    <Text style={{ ...styles.tinyText, color: theme.colors.primary, marginLeft: 8, flex: 1 }}>
                      {result.collection.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

