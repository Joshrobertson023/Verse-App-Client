import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import {
  addUserVersesToNewCollection,
  createCollectionDB,
  getMostRecentCollectionId,
  getPublishedCollection,
  getUserCollections,
  getUserVersesByCollectionWithVerses,
  incrementPublishedCollectionSaveCount,
  PublishedCollection,
  refreshUser,
  updateCollectionsOrder,
} from '../db';
import { Collection, useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface Props {
  collection: PublishedCollection;
  onSaved?: (publishedId: number) => void | Promise<void>;
  fullWidth?: boolean;
}

export default function ExploreCollectionCard({ collection, onSaved, fullWidth = false }: Props) {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((s) => s.user);
  const collections = useAppStore((s) => s.collections);
  const setCollections = useAppStore((s) => s.setCollections);
  const setUser = useAppStore((s) => s.setUser);

  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number>(collection.numSaves ?? 0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleSave = async () => {
    if (isSaving) return;
    if (!user?.username || user.username === 'Default User') {
      setSnackbarMessage('Sign in to save collections');
      setSnackbarVisible(true);
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

    setIsSaving(true);
    try {
      const published = await getPublishedCollection(collection.publishedId);
      if (!published) {
        setSnackbarMessage('This collection is no longer available');
        setSnackbarVisible(true);
        return;
      }

      if (collections.length >= 40) {
        setSnackbarMessage('You can create up to 40 collections');
        setSnackbarVisible(true);
        return;
      }

      const normalizeReference = (reference: string | undefined | null) =>
        reference?.trim().replace(/\s+/g, ' ');

      const publishedVerses = await getUserVersesByCollectionWithVerses(collection.publishedId);
      const preparedUserVerses: UserVerse[] = (publishedVerses || []).map((uv) => {
        const readableReference = normalizeReference(uv.readableReference) ?? '';
        const seenVerseRefs = new Set<string>();
        const dedupedVerses = (uv.verses || []).filter((verse) => {
          const ref = normalizeReference(verse.verse_reference);
          if (!ref) return false;
          const key = ref.toLowerCase();
          if (seenVerseRefs.has(key)) {
            return false;
          }
          seenVerseRefs.add(key);
          verse.verse_reference = ref;
          return true;
        });

        return {
          ...uv,
          id: undefined,
          username: user.username,
          collectionId: undefined,
          progressPercent: 0,
          timesMemorized: 0,
          lastPracticed: undefined,
          dateMemorized: undefined,
          dateAdded: undefined,
          verses: dedupedVerses,
          readableReference,
        };
      });

      const dedupedUserVerseMap = new Map<string, UserVerse>();
      preparedUserVerses.forEach((uv) => {
        const ref = uv.readableReference;
        if (!ref) return;
        const key = ref.toLowerCase();
        const existing = dedupedUserVerseMap.get(key);
        if (existing) {
          const combined = existing.verses ? [...existing.verses] : [];
          const seenVerseRefs = new Set(combined.map((v) => (v.verse_reference ?? '').toLowerCase()));
          (uv.verses || []).forEach((v) => {
            const verseRef = (v.verse_reference ?? '').toLowerCase();
            if (!verseRef || seenVerseRefs.has(verseRef)) return;
            seenVerseRefs.add(verseRef);
            combined.push(v);
          });
          existing.verses = combined;
        } else {
          dedupedUserVerseMap.set(key, { ...uv, readableReference: ref, verses: [...(uv.verses || [])] });
        }
      });

      const publishedOrder = (published.verseOrder || '')
        .split(',')
        .map((ref) => normalizeReference(ref))
        .filter(Boolean) as string[];
      const uniqueOrder: string[] = [];
      const seenOrder = new Set<string>();
      publishedOrder.forEach((ref) => {
        const key = ref.toLowerCase();
        if (!seenOrder.has(key)) {
          uniqueOrder.push(ref);
          seenOrder.add(key);
        }
      });

      const orderedUserVerses: UserVerse[] = [];
      uniqueOrder.forEach((ref) => {
        const uv = dedupedUserVerseMap.get(ref.toLowerCase());
        if (uv) {
          orderedUserVerses.push(uv);
          dedupedUserVerseMap.delete(ref.toLowerCase());
        }
      });
      const remainingVerses = Array.from(dedupedUserVerseMap.values());
      const dedupedUserVerses = [...orderedUserVerses, ...remainingVerses].map((uv) => ({
        ...uv,
        readableReference: normalizeReference(uv.readableReference) ?? '',
        verses: (uv.verses || []).map((v) => ({
          ...v,
          verse_reference: normalizeReference(v.verse_reference) ?? v.verse_reference,
        })),
      }));

      if (dedupedUserVerses.length > 30) {
        setSnackbarMessage('Collections can contain up to 30 passages');
        setSnackbarVisible(true);
        return;
      }

      const duplicateCollection: Collection = {
        title: published.title,
        authorUsername: published.author,
        username: user.username,
        visibility: 'Private',
        verseOrder: uniqueOrder.join(','),
        userVerses: [],
        favorites: false,
      };

      await createCollectionDB(duplicateCollection, user.username);
      const newCollectionId = await getMostRecentCollectionId(user.username);

      if (dedupedUserVerses.length > 0) {
        await addUserVersesToNewCollection(dedupedUserVerses, newCollectionId);
      }

      try {
        await incrementPublishedCollectionSaveCount(collection, user.username);
      } catch (error) {
        console.error('Failed to increment published collection saves', error);
      }

      try {
        const updatedCollections = await getUserCollections(user.username);
        setCollections(updatedCollections);
      } catch (error) {
        console.error('Failed to refresh collections after saving published collection', error);
      }

      const currentOrder = user.collectionsOrder ? user.collectionsOrder.split(',').filter(Boolean) : [];
      if (!currentOrder.includes(newCollectionId.toString())) {
        currentOrder.push(newCollectionId.toString());
      }
      const newOrder = currentOrder.join(',');
      const updatedUser = { ...user, collectionsOrder: newOrder };
      setUser(updatedUser);

      try {
        await updateCollectionsOrder(newOrder, user.username);
      } catch (error) {
        console.error('Failed to update collections order after saving published collection', error);
      }

      try {
        const refreshedUser = await refreshUser(user.username);
        setUser(refreshedUser);
      } catch (error) {
        console.error('Failed to refresh user after saving published collection', error);
      }

      setSavedCount((count) => count + 1);
      try {
        await onSaved?.(collection.publishedId);
      } catch (error) {
        console.error('onSaved callback failed', error);
      }

      setSnackbarMessage('Collection saved');
    } catch (error) {
      console.error('Failed to save published collection', error);
      const message = error instanceof Error ? error.message : 'Failed to save collection';
      setSnackbarMessage(message || 'Failed to save collection');
    } finally {
      setSnackbarVisible(true);
      setIsSaving(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`../explore/collection/${collection.publishedId}` as any)}
      style={{
        width: fullWidth ? '100%' : 300,
        borderRadius: 14,
        padding: 14,
        marginHorizontal: fullWidth ? 0 : 8,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text numberOfLines={1} style={{ ...styles.text, fontWeight: 700, marginRight: 12 }}>{collection.title}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 4,
            marginTop: -12,
            borderRadius: 8,
            backgroundColor: theme.colors.surface2,
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.onSurface} />
          ) : (
            <Text style={{ ...styles.tinyText, fontWeight: 600, fontFamily: 'Inter', marginBottom: 0 }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: -4 }}>
        <Ionicons name="people" size={14} color={theme.colors.onSurface} style={{ marginRight: 6 }} />
        <Text style={{...styles.tinyText, fontSize: 14}}>{savedCount} {(savedCount === 1 ? 'Save' : 'Saves')}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <Text style={styles.tinyText}>{collection.userVerses?.length ?? 0} {(collection.userVerses?.length ?? 0) === 1 ? 'passage' : 'passages'}</Text>
        <Text style={styles.tinyText}>@{collection.author}</Text>
      </View>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        style={{ backgroundColor: theme.colors.surface, alignSelf: 'flex-end', marginTop: 8 }}
      >
        <Text style={{ color: theme.colors.onSurface }}>{snackbarMessage}</Text>
      </Snackbar>
    </TouchableOpacity>
  );
}


