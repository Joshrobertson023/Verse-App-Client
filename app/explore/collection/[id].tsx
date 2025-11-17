import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { ActivityIndicator, Snackbar, Text } from 'react-native-paper';
import CollectionNoteItem from '../../components/collectionNote';
import { addUserVersesToNewCollection, Category, createCollectionDB, getAllCategories, getMostRecentCollectionId, getPublishedCollection, getUserCollections, getUserProfile, getUserVersesByCollectionWithVerses, incrementPublishedCollectionSaveCount, PublishedCollection, refreshUser, updateCollectionDB, updateCollectionsOrder } from '../../db';
import { Collection, CollectionNote, useAppStore, UserVerse } from '../../store';
import useStyles from '../../styles';
import useAppTheme from '../../theme';

export default function PublishedCollectionView() {
  const styles = useStyles();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const user = useAppStore((s) => s.user);
  const setCollections = useAppStore((s) => s.setCollections);
  const collections = useAppStore((s) => s.collections);
  const setUser = useAppStore((s) => s.setUser);

  const [collection, setCollection] = useState<PublishedCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [authorProfile, setAuthorProfile] = useState<{ firstName: string; lastName: string; username: string } | null>(null);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const cats = await getAllCategories();
        setAllCategories(cats);
      } catch {}
    })();
  }, []);

  // Derive category names and IDs from collection with a single categories fetch
  const categoryInfo = useMemo<Array<{ name: string; id: number }>>(() => {
    if (!collection) return [];
    const idToName = new Map<number, string>(allCategories.map(c => [c.categoryId, c.name]));
    const ids = (collection.categoryIds || []);
    const categories: Array<{ name: string; id: number }> = [];
    const seen = new Set<string>();
    ids.forEach((id) => {
      const n = idToName.get(id);
      if (n) {
        const key = n.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          categories.push({ name: n, id });
        }
      }
    });
    return categories;
  }, [collection, allCategories]);

  useLayoutEffect(() => {
    if (collection) {
      navigation.setOptions({
        title: collection.title,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people" size={14} color={theme.colors.onSurface} style={{ marginRight: 6 }} />
              <Text style={{ ...styles.tinyText, fontSize: 14, marginBottom: 0 }}>{savedCount}</Text>
            </View>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: theme.colors.surface2,
                opacity: isSaving ? 0.6 : 1
              }}
            >
              {isSaving ? (
                <ActivityIndicator animating size="small" color={theme.colors.onSurface} />
              ) : (
                <Text style={{ ...styles.tinyText, fontWeight: 600, fontFamily: 'Inter', marginBottom: 0 }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [collection, isSaving, savedCount, theme.colors.surface2, theme.colors.onSurface]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const publishedId = Number(id);
        if (Number.isNaN(publishedId)) {
          setErrorMessage('Invalid collection id.');
          setLoading(false);
          return;
        }

        const [published, verses] = await Promise.all([
          getPublishedCollection(publishedId),
          getUserVersesByCollectionWithVerses(publishedId)
        ]);
        if (cancelled) return;

        if (!published) {
          setCollection(null);
          setErrorMessage('This collection is no longer available.');
        } else {
          const preparedVerses = (verses || []).map((uv) => ({
            ...uv,
            verses: uv.verses || []
          }));

          setCollection({
            ...published,
            userVerses: preparedVerses
          });
          setSavedCount(published.numSaves ?? 0);
          setErrorMessage(null);
          
          // Fetch author profile to get first and last name
          if (published.author) {
            try {
              const profile = await getUserProfile(published.author);
              if (!cancelled) {
                setAuthorProfile({
                  firstName: profile.firstName || '',
                  lastName: profile.lastName || '',
                  username: profile.username
                });
              }
            } catch (e) {
              console.error('Failed to fetch author profile:', e);
              // Fallback to just username if profile fetch fails
              if (!cancelled) {
                setAuthorProfile({
                  firstName: '',
                  lastName: '',
                  username: published.author
                });
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load published collection', e);
        setErrorMessage('Unable to load this collection. It may have been removed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const numVerses = useMemo(() => collection?.userVerses?.length ?? 0, [collection]);
  const orderedItems = useMemo(() => {
    if (!collection) return [];
    const verseOrder = (collection.verseOrder ?? '').trim();
    const verses = collection.userVerses ?? [];
    const notes: CollectionNote[] = (collection as any).notes ?? [];
    if (!verseOrder) {
      const items: Array<{type:'verse'|'note'; data:any}> = [];
      verses.forEach(v => items.push({type:'verse', data:v}));
      notes.forEach(n => items.push({type:'note', data:n}));
      return items;
    }
    const orderArray = verseOrder.split(',').map(t => t.trim()).filter(Boolean);
    const verseMap = new Map<string, UserVerse>();
    verses.forEach(uv => {
      if (uv.readableReference) verseMap.set(uv.readableReference.trim().toLowerCase(), uv);
    });
    const noteMap = new Map<string, CollectionNote>();
    notes.forEach(n => { if (n.id) noteMap.set(n.id.trim(), n); });
    const items: Array<{type:'verse'|'note'; data:any}> = [];
    orderArray.forEach(tok => {
      const lower = tok.toLowerCase();
      if (noteMap.has(tok)) {
        items.push({type:'note', data: noteMap.get(tok)!});
        noteMap.delete(tok);
      } else if (verseMap.has(lower)) {
        items.push({type:'verse', data: verseMap.get(lower)!});
        verseMap.delete(lower);
      }
    });
    verseMap.forEach(v => items.push({type:'verse', data:v}));
    noteMap.forEach(n => items.push({type:'note', data:n}));
    return items;
  }, [collection?.verseOrder, collection?.userVerses, (collection as any)?.notes]);
  const publishedDateText = useMemo(() => {
    if (!collection?.publishedDate) return null;
    const date = new Date(collection.publishedDate);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [collection?.publishedDate]);

  const handleSave = async () => {
    if (!collection) return;
    
    // Check collection limit based on paid status
    const maxCollections = user.isPaid ? 40 : 5;
    if (collections.length >= maxCollections) {
      if (!user.isPaid) {
        router.push('/pro');
        return;
      }
      setErrorMessage('You can create up to 40 collections.');
      return;
    }
    if ((collection.userVerses?.length ?? 0) > 30) {
      setErrorMessage('Collections can contain up to 30 passages.');
      return;
    }

    const targetAuthor = (collection.author ?? '').trim().toLowerCase();
    const targetTitle = (collection.title ?? '').trim().toLowerCase();
    const targetCopyTitle = (`${collection.title} (Copy)`).trim().toLowerCase();
    const targetVerseOrder = (collection.verseOrder ?? '').trim();

    const alreadyHasCollection =
      targetAuthor.length > 0 &&
      collections.some((existing) => {
        const existingAuthor = (existing.authorUsername ?? existing.username ?? '').trim().toLowerCase();
        if (!existingAuthor || existingAuthor !== targetAuthor) {
          return false;
        }

        const existingTitle = (existing.title ?? '').trim().toLowerCase();
        const titleMatches = existingTitle === targetTitle || existingTitle === targetCopyTitle;

        const existingVerseOrder = (existing.verseOrder ?? '').trim();
        const verseOrderMatches =
          targetVerseOrder.length > 0 &&
          existingVerseOrder.length > 0 &&
          existingVerseOrder === targetVerseOrder;

        return titleMatches || verseOrderMatches;
      });

    if (alreadyHasCollection) {
      setSnackbarMessage('You already saved this collection');
      setSnackbarVisible(true);
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);
    try {
      const duplicateCollection: Collection = {
        title: `${collection.title} (Copy)`,
        authorUsername: collection.author,
        username: user.username,
        visibility: 'Private',
        verseOrder: collection.verseOrder,
        userVerses: [],
        collectionId: undefined,
        favorites: false
      } as any;

      await createCollectionDB(duplicateCollection, user.username);
      const newCollectionId = await getMostRecentCollectionId(user.username);

      // Persist notes and verse order onto the new collection before adding verses
      try {
        const notes: CollectionNote[] = (collection as any).notes ?? [];
        const updated: Collection = {
          collectionId: newCollectionId,
          title: duplicateCollection.title,
          authorUsername: duplicateCollection.authorUsername,
          username: user.username,
          visibility: 'Private',
          verseOrder: collection.verseOrder ?? '',
          userVerses: [],
          notes,
          favorites: false,
        };
        await updateCollectionDB(updated);
      } catch (e) {
        console.warn('Failed to set notes/verseOrder on new collection:', e);
      }

      if (collection.userVerses && collection.userVerses.length > 0) {
        await addUserVersesToNewCollection(collection.userVerses, newCollectionId);
      }

      try {
        await incrementPublishedCollectionSaveCount(collection, user.username);
        setCollection((prev) =>
          prev ? { ...prev, numSaves: (prev.numSaves ?? 0) + 1 } : prev
        );
        setSavedCount((count) => count + 1);
      } catch (error) {
        console.error('Failed to increment published collection saves', error);
      }

      const updatedCollections = await getUserCollections(user.username);
      setCollections(updatedCollections);
      const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
      const newOrder = currentOrder ? `${currentOrder},${newCollectionId}` : newCollectionId.toString();
      setUser({ ...user, collectionsOrder: newOrder });
      try { await updateCollectionsOrder(newOrder, user.username); } catch {}
      try { const refreshedUser = await refreshUser(user.username); setUser(refreshedUser); } catch {}
    } catch (e) {
      console.error('Failed to save published collection', e);
      const message = e instanceof Error ? e.message : 'Failed to save published collection';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator animating size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 }}>
        <Text style={{ color: theme.colors.onBackground, opacity: 0.8 }}>
          {errorMessage || 'This collection is no longer available.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        {collection.description ? (
          <Text style={{...styles.tinyText, fontFamily: 'Noto Serif'}}>{collection.description}</Text>
        ) : (
          
        <Text style={{ ...styles.tinyText }}>No description</Text>
        )}
        <View />
      </View>


      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="person-outline" size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={{ 
                  ...styles.tinyText, 
                  marginLeft: 8, 
                  color: theme.colors.onSurfaceVariant,
                  fontSize: 14 
                }}>
                  Created by: {(() => {
                    if (authorProfile) {
                      const fullName = `${authorProfile.firstName} ${authorProfile.lastName}`.trim();
                      return fullName ? `${fullName} @${authorProfile.username}` : `@${authorProfile.username}`;
                    }
                    return collection.author;
                  })()}
                </Text>
              </View>
              {publishedDateText && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={18} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ 
                    ...styles.tinyText, 
                    marginLeft: 8, 
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 14 
                  }}>
                    Last updated: {publishedDateText}
                  </Text>
                </View>
              )}
              
        <Text style={{ ...styles.tinyText, marginTop: 8 }}>{numVerses} {numVerses === 1 ? 'passage' : 'passages'}</Text>
        {categoryInfo.length > 0 && (
          <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categoryInfo.map((category, idx) => (
              <TouchableOpacity
                key={`${category.name}-${category.id}-${idx}`}
                onPress={() => router.push(`/explore/category/${category.id}` as any)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: theme.colors.surface2,
                }}
              >
                <Text style={{ ...styles.tinyText, marginBottom: 0 }}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      <View style={{ height: 50 }} />

      <View>
        {orderedItems.map((item, idx) => {
          if (item.type === 'note') {
            const note = item.data as CollectionNote;
            return (
              <CollectionNoteItem
                key={note.id || `note-${idx}`}
                note={note}
                isOwned={false}
              />
            );
          }
          const uv = item.data as UserVerse;
          return (
            <View key={uv.readableReference || `uv-${idx}`} style={{ minWidth: '100%', marginBottom: 20 }}>
              <View style={{ minWidth: '100%', borderRadius: 3 }}>
                <View>
                  <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600 }}>{uv.readableReference}</Text>
                  {(uv.verses || []).map((v, vIdx) => {
                    const verseNumberText = (() => {
                      if (v.verse_Number === null || v.verse_Number === undefined) {
                        return (vIdx + 1).toString();
                      }
                      const asString = `${v.verse_Number}`.trim();
                      return asString.length > 0 ? asString : (vIdx + 1).toString();
                    })();
                    return (
                      <View key={v.verse_reference || `${uv.readableReference}-v-${vIdx}`} style={{}}>
                        <View>
                          <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 18 }}>
                            {`${verseNumberText}: ${v.text}`}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
              {/* Match collection view styling with a divider */}
              {/* Using a simple line via a View to avoid adding new imports if not present */}
              <View style={{ height: 1, backgroundColor: theme.colors.surface2, marginHorizontal: -50, marginTop: 20 }} />
            </View>
          );
        })}
      </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <Snackbar
        visible={snackbarVisible}
        duration={2500}
        onDismiss={() => setSnackbarVisible(false)}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
}


