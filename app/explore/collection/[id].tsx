import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import { addUserVersesToNewCollection, createCollectionDB, getMostRecentCollectionId, getPublishedCollection, getUserCollections, getUserVersesByCollectionWithVerses, incrementPublishedCollectionSaveCount, PublishedCollection, refreshUser, updateCollectionsOrder } from '../../db';
import { Collection, useAppStore, UserVerse } from '../../store';
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

  useLayoutEffect(() => {
    if (collection) {
      navigation.setOptions({ title: collection.title });
    }
  }, [collection]);

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
    if (collections.length >= 40) {
      setErrorMessage('You can create up to 40 collections.');
      return;
    }
    if ((collection.userVerses?.length ?? 0) > 30) {
      setErrorMessage('Collections can contain up to 30 passages.');
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
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ ...styles.tinyText }}>{numVerses} {numVerses === 1 ? 'verse' : 'verses'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={{
              paddingHorizontal: 20,
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
      </View>

      
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: -4 }}>
        <Ionicons name="people" size={14} color={theme.colors.onSurface} style={{ marginRight: 6 }} />
        <Text style={{...styles.tinyText, fontSize: 14}}>{savedCount} {(savedCount === 1 ? 'Save' : 'Saves')}</Text>
      </View>

      {!!publishedDateText && (
        <Text style={{ ...styles.tinyText, marginTop: 6 }}>
          Published on {publishedDateText}
        </Text>
      )}

      <Text style={{ ...styles.tinyText, marginTop: 6 }}>
        Created by @{collection.author}
      </Text>

      {!!collection.description && (
        <Surface style={{ minWidth: '100%', padding: 14, borderRadius: 6, backgroundColor: theme.colors.surface, marginTop: 12 }} elevation={2}>
          <Text style={{ ...styles.text }}>{collection.description}</Text>
        </Surface>
      )}

      <View style={{ height: 16 }} />

      <View>
        {(collection.userVerses || []).map((uv: UserVerse, idx) => (
          <View key={uv.readableReference || `uv-${idx}`} style={{ minWidth: '100%', marginBottom: 16 }}>
            <Surface style={{ minWidth: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }} elevation={4}>
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
                    <View key={v.verse_reference || `${uv.readableReference}-v-${vIdx}`}>
                      <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 18 }}>
                        {`${verseNumberText}: ${v.text}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Surface>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}


