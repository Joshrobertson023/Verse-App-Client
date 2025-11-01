import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Surface, Text } from 'react-native-paper';
import { getMostRecentCollectionId, getPublishedInfo, getUserCollections, notifyAuthorCollectionSaved, createCollectionDB, addUserVersesToNewCollection, updateCollectionsOrder, refreshUser, getCollectionById, getUserVersesByCollectionWithVerses } from '../../db';
import { Collection, UserVerse, useAppStore } from '../../store';
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
  const setUser = useAppStore((s) => s.setUser);

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishedDescription, setPublishedDescription] = useState<string | null>(null);

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
        const [baseCol, verses, pub] = await Promise.all([
          getCollectionById(Number(id)),
          getUserVersesByCollectionWithVerses(Number(id)),
          getPublishedInfo(Number(id))
        ]);
        if (cancelled) return;
        if (!baseCol) {
          setCollection(null);
          setErrorMessage('This collection is no longer available.');
        } else {
          setCollection({ ...baseCol, userVerses: verses || [] } as any);
        }
        setPublishedDescription(pub?.description ?? null);
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

  const handleSave = async () => {
    if (!collection) return;
    try {
      const duplicateCollection: Collection = {
        ...collection,
        title: `${collection.title} (Copy)`,
        collectionId: undefined,
        favorites: false,
      } as any;

      await createCollectionDB(duplicateCollection, user.username);
      const newCollectionId = await getMostRecentCollectionId(user.username);
      if (collection.userVerses && collection.userVerses.length > 0) {
        await addUserVersesToNewCollection(collection.userVerses, newCollectionId);
      }
      const updatedCollections = await getUserCollections(user.username);
      setCollections(updatedCollections);
      const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
      const newOrder = currentOrder ? `${currentOrder},${newCollectionId}` : newCollectionId.toString();
      setUser({ ...user, collectionsOrder: newOrder });
      try { await updateCollectionsOrder(newOrder, user.username); } catch {}
      try { const refreshedUser = await refreshUser(user.username); setUser(refreshedUser); } catch {}
      try { await notifyAuthorCollectionSaved(user.username, Number(id)); } catch {}
    } catch (e) {
      console.error('Failed to save published collection', e);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
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
            style={{ paddingHorizontal: 20, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.surfaceVariant }}
          >
            <Text style={{ ...styles.tinyText, fontWeight: 600, fontFamily: 'Inter', marginBottom: 0 }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
        <Ionicons name="people" size={16} color={theme.colors.onSurface} style={{ marginRight: 6 }} />
        <Text style={styles.tinyText}>{collection.numSaves ?? 0} Saves</Text>
      </View>

      <Text style={{ ...styles.tinyText, marginTop: 6 }}>
        Created by @{collection.authorUsername}{publishedDescription ? ' ' : ''}
      </Text>

      {!!publishedDescription && (
        <Surface style={{ minWidth: '100%', padding: 14, borderRadius: 6, backgroundColor: theme.colors.surface, marginTop: 12 }} elevation={2}>
          <Text style={{ ...styles.text }}>{publishedDescription}</Text>
        </Surface>
      )}

      <View style={{ height: 16 }} />

      <View>
        {(collection.userVerses || []).map((uv: UserVerse, idx) => (
          <View key={uv.readableReference || `uv-${idx}`} style={{ minWidth: '100%', marginBottom: 16 }}>
            <Surface style={{ minWidth: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }} elevation={4}>
              <View>
                <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600 }}>{uv.readableReference}</Text>
                {(uv.verses || []).map((v, vIdx) => (
                  <View key={v.verse_reference || `${uv.readableReference}-v-${vIdx}`}> 
                    <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 18 }}>
                      {v.verse_Number}: {v.text}
                    </Text>
                  </View>
                ))}
              </View>
            </Surface>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}


