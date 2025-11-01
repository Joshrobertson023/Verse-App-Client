import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExploreCollectionCard from '../components/exploreCollectionCard';
import SearchResultVerseCard from '../components/searchResultVerseCard';
import ShareVerseSheet from '../components/shareVerseSheet';
import { Skeleton } from '../components/skeleton';
import { addUserVersesToNewCollection, getAllCategories, getCollectionsByCategory, getPopularPublishedCollections, getRecentPublishedCollections, getTopMemorizedVerses, getTopSavedVerses, updateCollectionDB } from '../db';
import { Collection, useAppStore, UserVerse, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function ExploreScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const [popular, setPopular] = useState<Collection[]>([]);
  const [recent, setRecent] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<{ category_Id: number; name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryCollections, setCategoryCollections] = useState<Collection[]>([]);
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
  const { width } = Dimensions.get('window');
  const [verseToShare, setVerseToShare] = useState<Verse | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [cats, pop, rec, saved, memo] = await Promise.all([
          getAllCategories(),
          getPopularPublishedCollections(20),
          getRecentPublishedCollections(20),
          getTopSavedVerses(20),
          getTopMemorizedVerses(20)
        ]);
        if (!isMounted) return;
        setCategories(cats);
        // Ensure a category is always active on load
        if (cats && cats.length > 0) {
          const firstId = cats[0].category_Id;
          setSelectedCategoryId(firstId);
          try {
            setIsCategoryLoading(true);
            const cols = await getCollectionsByCategory(firstId);
            setCategoryCollections(cols);
          } catch {
            setCategoryCollections([]);
          } finally {
            setIsCategoryLoading(false);
          }
        }
        setPopular(pop);
        setRecent(rec);
        setTopSaved(saved);
        setTopMemorized(memo);
        setIsLoading(false);
      } catch (e) {
        console.error('Failed to load explore data', e);
        setIsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);


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
        getPopularPublishedCollections(20),
        getRecentPublishedCollections(20)
      ]);
      setPopular(pop);
      setRecent(rec);
    } catch (e) {
      // ignore refresh failure
    }
  };

  const Horizontal = ({ data }: { data: Collection[] }) => (
    <ScrollView
      horizontal
      decelerationRate="fast"
          snapToInterval={317}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8 }}
    >
      {data.map((c) => (
        <ExploreCollectionCard key={c.collectionId} collection={c} onSaved={handleCollectionSaved} />
      ))}
    </ScrollView>
  );

  const onSelectCategory = async (id: number) => {
    setSelectedCategoryId(id);
    setIsCategoryLoading(true);
    try {
      const cols = await getCollectionsByCategory(id);
      setCategoryCollections(cols);
    } catch (e) {
      setCategoryCollections([]);
    } finally {
      setIsCategoryLoading(false);
    }
  };

  const CategoryChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 96, marginBottom: -50 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 8, height: 96 }}>
        {categories.map(c => (
          <TouchableOpacity key={c.category_Id} onPress={() => onSelectCategory(c.category_Id)}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: selectedCategoryId === c.category_Id ? '#FFFFFF' : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline }}>
              <Text style={{ color: selectedCategoryId === c.category_Id ? theme.colors.onBackground : theme.colors.onSurface }}>{c.name}</Text>
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

  const handleAddToCollection = async () => {
    if (!pickedCollection || !selectedVerse || !user.username || isAddingToCollection) return;

    const parsed = parseVerseReference(selectedVerse.verse_reference);
    if (!parsed) return;

    const alreadyExists = pickedCollection.userVerses.some(
      uv => uv.readableReference === selectedVerse.verse_reference
    );
    if (alreadyExists) {
      setSnackbarMessage('This passage is already in the collection');
      setSnackbarVisible(true);
      setShowCollectionPicker(false);
      setSelectedVerse(null);
      setPickedCollection(undefined);
      return;
    }

    setIsAddingToCollection(true);

    const userVerse: UserVerse = {
      username: user.username,
      readableReference: selectedVerse.verse_reference,
      verses: [selectedVerse]
    };

    try {
      await addUserVersesToNewCollection([userVerse], pickedCollection.collectionId!);

      const currentOrder = pickedCollection.verseOrder || '';
      const newOrder = currentOrder ? `${currentOrder}${selectedVerse.verse_reference},` : `${selectedVerse.verse_reference},`;

      const updatedCollection = {
        ...pickedCollection,
        userVerses: [...pickedCollection.userVerses, userVerse],
        verseOrder: newOrder,
      } as Collection;

      await updateCollectionDB(updatedCollection);
      setCollections(collections.map(c => 
        c.collectionId === pickedCollection.collectionId ? updatedCollection : c
      ));

      setShowCollectionPicker(false);
      setSelectedVerse(null);
      setPickedCollection(undefined);
      setIsAddingToCollection(false);
      setSnackbarMessage('Verse added to collection!');
      setSnackbarVisible(true);
    } catch (error) {
      setSnackbarMessage('Failed to add verse to collection');
      setSnackbarVisible(true);
      setIsAddingToCollection(false);
    }
  };

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
    <ScrollView style={{backgroundColor: theme.colors.background}}>
      
      {/* Category header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16 }}>
        <Text style={{ ...styles.text, fontWeight: 700 }}>Category</Text>
      </View>
      {/* Category chips below header */}
      <View style={{ marginTop: 8 }}>
        {isLoading && categories.length === 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 96 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 8, height: 96 }}>
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
            <ExploreCollectionCard key={`cat-${c.collectionId}`} collection={c} onSaved={handleCollectionSaved} />
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
                onPress={handleAddToCollection}
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