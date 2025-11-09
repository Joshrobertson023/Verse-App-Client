import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExploreCollectionCard from '../components/exploreCollectionCard';
import SearchResultVerseCard from '../components/searchResultVerseCard';
import ShareVerseSheet from '../components/shareVerseSheet';
import { Skeleton } from '../components/skeleton';
import { Category, getAllCategories, getCollectionsByCategory, getPopularPublishedCollections, getRecentPublishedCollections, getTopMemorizedVerses, getTopSavedVerses, PublishedCollection } from '../db';
import { Collection, useAppStore, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function ExploreScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const [popular, setPopular] = useState<PublishedCollection[]>([]);
  const [recent, setRecent] = useState<PublishedCollection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryCollections, setCategoryCollections] = useState<PublishedCollection[]>([]);
  const [topSaved, setTopSaved] = useState<any[]>([]);
  const [topMemorized, setTopMemorized] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCategoryLoading, setIsCategoryLoading] = useState<boolean>(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [pickedCollection, setPickedCollection] = useState<Collection | undefined>(undefined);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [verseToShare, setVerseToShare] = useState<Verse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const selectedCategoryRef = useRef<number | null>(null);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategoryId;
  }, [selectedCategoryId]);

  const sortCollectionsBySaves = useCallback((cols: PublishedCollection[]) => {
    return [...cols].sort((a, b) => {
      const savesA = typeof a.numSaves === 'number' ? a.numSaves : 0;
      const savesB = typeof b.numSaves === 'number' ? b.numSaves : 0;
      return savesB - savesA;
    });
  }, []);

  const fetchCategoryCollections = useCallback(async (id: number | null) => {
    if (id == null) {
      setCategoryCollections([]);
      setIsCategoryLoading(false);
      return;
    }
    setIsCategoryLoading(true);
    try {
      const cols = await getCollectionsByCategory(id);
      setCategoryCollections(sortCollectionsBySaves(cols));
    } catch (e) {
      setCategoryCollections([]);
    } finally {
      setIsCategoryLoading(false);
    }
  }, [sortCollectionsBySaves]);

  const loadExploreData = useCallback(async (initial = false) => {
    if (initial) {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const loadedCategories = await getAllCategories();
      setCategories(loadedCategories);

      let categoryId = selectedCategoryRef.current;

      if (!categoryId || !loadedCategories.some((c) => c.categoryId === categoryId)) {
        categoryId = loadedCategories.length > 0 ? loadedCategories[0].categoryId : null;
        setSelectedCategoryId(categoryId);
        selectedCategoryRef.current = categoryId;
      } else {
        selectedCategoryRef.current = categoryId;
      }

      if (categoryId != null) {
        await fetchCategoryCollections(categoryId);
      } else {
        setCategoryCollections([]);
      }

      const [pop, rec, saved, memorized] = await Promise.all([
        getPopularPublishedCollections(),
        getRecentPublishedCollections(),
        getTopSavedVerses(),
        getTopMemorizedVerses()
      ]);

      setPopular(pop);
      setRecent(rec);
      setTopSaved(saved);
      setTopMemorized(memorized);
    } catch (e) {
      console.error('Failed to load explore data', e);
      if (!initial) {
        setSnackbarMessage('Failed to refresh explore data');
        setSnackbarVisible(true);
      }
    } finally {
      if (initial) {
        setIsLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [fetchCategoryCollections]);

  useEffect(() => {
    loadExploreData(true);
  }, [loadExploreData]);


  const SectionHeader = ({ title, route }: { title: string; route: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16 }}>
      <Text style={{ ...styles.text, fontWeight: 700 }}>{title}</Text>
      <TouchableOpacity onPress={() => router.push(route as any)}>
        <Text style={{ ...styles.tinyText, color: theme.colors.primary }}>See all</Text>
      </TouchableOpacity>
    </View>
  );

  const handleCollectionSaved = async (_id: number) => {
    try {
      const [pop, rec] = await Promise.all([
        getPopularPublishedCollections(),
        getRecentPublishedCollections()
      ]);
      setPopular(pop);
      setRecent(rec);
    } catch (e) {
      // ignore refresh failure
    }
  };

  const Horizontal = ({ data }: { data: PublishedCollection[] }) => (
    <ScrollView
      horizontal
      decelerationRate="fast"
          snapToInterval={317}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8 }}
    >
      {data.map((c) => (
        <ExploreCollectionCard key={c.publishedId} collection={c} onSaved={handleCollectionSaved} />
      ))}
    </ScrollView>
  );

  const onSelectCategory = async (id: number) => {
    setSelectedCategoryId(id);
    selectedCategoryRef.current = id;
    await fetchCategoryCollections(id);
  };

  const CategoryChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
        {categories.map(c => (
          <TouchableOpacity activeOpacity={0.8} key={c.categoryId} onPress={() => onSelectCategory(c.categoryId)}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: selectedCategoryId === c.categoryId ? theme.colors.primary : theme.colors.background, borderWidth: selectedCategoryId === c.categoryId ? 0 : 1, borderColor: theme.colors.outline }}>
              <Text style={{ color: selectedCategoryId === c.categoryId ? theme.colors.background : theme.colors.onSurface }}>{c.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const parseVerseReference = (reference: string) => {
    const parts = reference.split(':');
    if (parts.length < 2) return null;
    const versePart = parts[1].trim();
    const bookChapterPart = parts[0].trim();
    const lastSpaceIndex = bookChapterPart.lastIndexOf(' ');
    if (lastSpaceIndex === -1) return null;
    const bookName = bookChapterPart.substring(0, lastSpaceIndex).trim();
    const chapter = parseInt(bookChapterPart.substring(lastSpaceIndex + 1).trim());
    const verse = parseInt(versePart);
    return { bookName, chapter, verse };
  };

  const handleSaveVerse = (verse: Verse) => {
    setSelectedVerse(verse);
    setPickedCollection(undefined);
    setShowCollectionPicker(true);
  };

  // const handleAddToCollection = async () => {
  //   if (!pickedCollection || !selectedVerse || !user.username || isAddingToCollection) return;

  //   const parsed = parseVerseReference(selectedVerse.verse_reference);
  //   if (!parsed) return;

  //   const alreadyExists = pickedCollection.userVerses.some(
  //     uv => uv.readableReference === selectedVerse.verse_reference
  //   );
  //   if (alreadyExists) {
  //     setSnackbarMessage('This passage is already in the collection');
  //     setSnackbarVisible(true);
  //     setShowCollectionPicker(false);
  //     setSelectedVerse(null);
  //     setPickedCollection(undefined);
  //     return;
  //   }

  //   setIsAddingToCollection(true);

  //   const userVerse: UserVerse = {
  //     username: user.username,
  //     readableReference: selectedVerse.verse_reference,
  //     verses: [selectedVerse]
  //   };

  //   try {
  //     await addUserVersesToNewCollection([userVerse], pickedCollection.collectionId!);

  //     const currentOrder = pickedCollection.verseOrder || '';
  //     const newOrder = currentOrder ? `${currentOrder}${selectedVerse.verse_reference},` : `${selectedVerse.verse_reference},`;

  //     const updatedCollection = {
  //       ...pickedCollection,
  //       userVerses: [...pickedCollection.userVerses, userVerse],
  //       verseOrder: newOrder,
  //     } as Collection;

  //     await updateCollectionDB(updatedCollection);
  //     setCollections(collections.map(c => 
  //       c.collectionId === pickedCollection.collectionId ? updatedCollection : c
  //     ));

  //     setShowCollectionPicker(false);
  //     setSelectedVerse(null);
  //     setPickedCollection(undefined);
  //     setIsAddingToCollection(false);
  //     setSnackbarMessage('Verse added to collection!');
  //     setSnackbarVisible(true);
  //   } catch (error) {
  //     setSnackbarMessage('Failed to add verse to collection');
  //     setSnackbarVisible(true);
  //     setIsAddingToCollection(false);
  //   }
  // };

  const handleReadVerse = (verse: Verse) => {
    const parsed = parseVerseReference(verse.verse_reference);
    if (!parsed) {
      setSnackbarMessage('Could not parse verse reference');
      setSnackbarVisible(true);
      return;
    }
    const encodedBookName = encodeURIComponent(parsed.bookName);
    router.push(`../book/${encodedBookName}?chapter=${parsed.chapter}` as any);
  };

  const handleShareVerse = (verse: Verse) => {
    setVerseToShare(verse);
  };

  const handleShareSuccess = () => {
    setVerseToShare(null);
    setSnackbarMessage('Verse shared');
    setSnackbarVisible(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
    <ScrollView
      style={{backgroundColor: theme.colors.background}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadExploreData(false)}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      
      {/* Category header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16 }}>
        <Text style={{ ...styles.text, fontWeight: 700 }}>Category</Text>
      </View>
      {/* Category chips below header */}
      <View style={{ marginTop: 8 }}>
        {isLoading && categories.length === 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
              {[1,2,3,4,5,6].map(i => (
                <Skeleton key={i} width={90} height={32} borderRadius={20} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <CategoryChips />
        )}
      </View>
      {/* Category collection items */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {isCategoryLoading ? (
          [1,2,3].map(i => (
            <View key={`cat-skel-${i}`} style={{ marginHorizontal: 8 }}>
              <Skeleton width={300} height={110} borderRadius={14} />
            </View>
          ))
        ) : categoryCollections.length === 0 ? (
          <View style={{ marginHorizontal: 16, paddingVertical: 20 }}>
            <Text style={{ ...styles.tinyText, color: theme.colors.onSurface }}>
              No collections found for this category yet.
            </Text>
          </View>
        ) : (
          categoryCollections.map((c) => (
            <ExploreCollectionCard key={`cat-${c.publishedId}`} collection={c} onSaved={handleCollectionSaved} />
          ))
        )}
      </ScrollView>

      <SectionHeader title="Popular" route="../explore/popular" />
      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {[1,2,3].map(i => (
            <View key={`pop-skel-${i}`} style={{ marginHorizontal: 8 }}>
              <Skeleton width={300} height={110} borderRadius={14} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <Horizontal data={popular} />
      )}

      <SectionHeader title="Latest Collections" route="../explore/recent" />
      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {[1,2,3].map(i => (
            <View key={`rec-skel-${i}`} style={{ marginHorizontal: 8 }}>
              <Skeleton width={300} height={110} borderRadius={14} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <Horizontal data={recent} />
      )}

      <View style={{ height: 16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16 }}>
        <Text style={{ ...styles.text, fontWeight: 700 }}>Most Saved Verses</Text>
      </View>
      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {[1,2,3].map(i => (
            <View key={`saved-skel-${i}`} style={{ marginHorizontal: 8 }}>
              <Skeleton width={300} height={140} borderRadius={14} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          decelerationRate="fast"
          snapToInterval={317}
          snapToAlignment="center"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          {topSaved.map((v: any, idx) => (
            <SearchResultVerseCard key={`${v.verse_reference}-${idx}`} verse={v} onSave={handleSaveVerse} onRead={handleReadVerse} onShare={handleShareVerse} />
          ))}
        </ScrollView>
      )}

      <View style={{ height: 16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16 }}>
        <Text style={{ ...styles.text, fontWeight: 700 }}>Most Memorized Verses</Text>
      </View>
      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {[1,2,3].map(i => (
            <View key={`memo-skel-${i}`} style={{ marginHorizontal: 8 }}>
              <Skeleton width={300} height={140} borderRadius={14} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          decelerationRate="fast"
          snapToInterval={317}
          snapToAlignment="center"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          {topMemorized.map((v: any, idx) => (
            <SearchResultVerseCard key={`${v.verse_reference}-${idx}`} verse={v} onSave={handleSaveVerse} onRead={handleReadVerse} onShare={handleShareVerse} />
          ))}
        </ScrollView>
      )}
      <View style={{height: 60}} />

      <Modal
        visible={showCollectionPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCollectionPicker(false)}
      >
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{ 
            backgroundColor: theme.colors.surface, 
            borderRadius: 16, 
            padding: 20, 
            width: '85%',
            maxHeight: '70%'
          }}>
            <Text style={{ 
              fontSize: 20,
              fontWeight: '600',
              fontFamily: 'Inter',
              color: theme.colors.onBackground,
              marginBottom: 20
            }}>
              Choose a Collection
            </Text>

            <ScrollView>
              {(() => {
                const favorites = collections.filter(col => col.favorites || col.title === 'Favorites');
                const nonFavorites = collections.filter(col => !col.favorites && col.title !== 'Favorites');
                return (
                  <>
                    {favorites.map((collection) => (
                      <TouchableOpacity
                        key={collection.collectionId}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          marginBottom: 8,
                          backgroundColor: pickedCollection?.collectionId === collection.collectionId 
                            ? theme.colors.primary 
                            : 'transparent',
                          borderRadius: 8,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onPress={() => setPickedCollection(collection)}
                      >
                        <Text style={{
                          fontSize: 16,
                          color: pickedCollection?.collectionId === collection.collectionId 
                            ? '#fff' 
                            : theme.colors.onBackground,
                          fontFamily: 'Inter'
                        }}>
                          {collection.title}
                        </Text>
                        <Ionicons 
                          name="star" 
                          size={20} 
                          color={pickedCollection?.collectionId === collection.collectionId 
                            ? '#fff' 
                            : theme.colors.onBackground} 
                        />
                      </TouchableOpacity>
                    ))}
                    {nonFavorites.map((collection) => (
                      <TouchableOpacity
                        key={collection.collectionId}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          marginBottom: 8,
                          backgroundColor: pickedCollection?.collectionId === collection.collectionId 
                            ? theme.colors.primary 
                            : 'transparent',
                          borderRadius: 8
                        }}
                        onPress={() => setPickedCollection(collection)}
                      >
                        <Text style={{
                          fontSize: 16,
                          color: pickedCollection?.collectionId === collection.collectionId 
                            ? '#fff' 
                            : theme.colors.onBackground,
                          fontFamily: 'Inter'
                        }}>
                          {collection.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}
            </ScrollView>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 20
            }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8
                }}
                onPress={() => {
                  setPickedCollection(undefined);
                  setShowCollectionPicker(false);
                }}
              >
                <Text style={{
                  fontSize: 16,
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  opacity: (!pickedCollection || isAddingToCollection) ? 0.5 : 1
                }}
                //onPress={handleAddToCollection}
                disabled={!pickedCollection || isAddingToCollection}
              >
                {isAddingToCollection ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{
                    fontSize: 16,
                    color: '#fff',
                    fontFamily: 'Inter',
                    fontWeight: '600'
                  }}>
                    Add
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Text style={{ color: theme.colors.onSurface }}>
          {snackbarMessage}
        </Text>
      </Snackbar>

      <ShareVerseSheet
        visible={!!verseToShare}
        verseReference={verseToShare?.verse_reference || null}
        onClose={() => setVerseToShare(null)}
        onShareSuccess={handleShareSuccess}
        onShareError={() => { setSnackbarMessage('Failed to share verse'); setSnackbarVisible(true); }}
      />
    </ScrollView>
    </SafeAreaView>
  );
}