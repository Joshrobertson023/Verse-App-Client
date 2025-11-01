import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Collection, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { addUserVersesToNewCollection, createCollectionDB, getMostRecentCollectionId, getUserCollections, getUserVersesByCollectionWithVerses, notifyAuthorCollectionSaved, refreshUser, updateCollectionsOrder, getCollectionById, incrementCollectionSaves } from '../db';
import { Snackbar } from 'react-native-paper';

interface Props {
  collection: Collection;
  onSaved?: (collectionId: number) => void | Promise<void>;
}

export default function ExploreCollectionCard({ collection, onSaved }: Props) {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((s) => s.user);
  const setCollections = useAppStore((s) => s.setCollections);
  const setUser = useAppStore((s) => s.setUser);

  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number>(collection.numSaves ?? 0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Fetch fresh metadata and verses by collection ID (robust against stale props)
      const metadata = await getCollectionById(collection.collectionId!);
      const sourceUserVerses = await getUserVersesByCollectionWithVerses(collection.collectionId!);

      // Prepare userVerses for insertion under current user
      const preparedUserVerses = (sourceUserVerses || []).map(uv => ({
        ...uv,
        id: undefined,
        username: user.username,
        collectionId: undefined,
        progressPercent: 0,
        timesMemorized: 0,
        lastPracticed: undefined,
        dateMemorized: undefined,
        dateAdded: undefined,
      }));

      // Create a new collection in the user's account but keep original author attribution
      const duplicateCollection: Collection = {
      	title: metadata.title,
      	authorUsername: user.username, // set owner to current user so it appears in their collections
      	visibility: metadata.visibility,
      	verseOrder: metadata.verseOrder,
      	userVerses: preparedUserVerses,
      	favorites: false,
      } as any;

      await createCollectionDB(duplicateCollection, user.username);
      const newCollectionId = await getMostRecentCollectionId(user.username);

      if (preparedUserVerses.length > 0) {
        await addUserVersesToNewCollection(preparedUserVerses, newCollectionId);
      }

      try {
        const updatedCollections = await getUserCollections(user.username);
        setCollections(updatedCollections);
      } catch {}

      const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
      const newOrder = currentOrder ? `${currentOrder},${newCollectionId}` : newCollectionId.toString();
      setUser({ ...user, collectionsOrder: newOrder });
      try { await updateCollectionsOrder(newOrder, user.username); } catch {}
      try { const refreshedUser = await refreshUser(user.username); setUser(refreshedUser); } catch {}
      try { await notifyAuthorCollectionSaved(user.username, collection.collectionId!); } catch {}
      try { await incrementCollectionSaves(collection.collectionId!); } catch {}

      setSavedCount((c) => c + 1);
      try { await onSaved?.(collection.collectionId!); } catch {}
      setSnackbarMessage('Collection saved');
      setSnackbarVisible(true);
    } catch (e) {
      setSnackbarMessage('Failed to save collection');
      setSnackbarVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`../explore/collection/${collection.collectionId}` as any)}
      style={{
        width: 300,
        borderRadius: 14,
        padding: 14,
        marginHorizontal: 8,
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
            borderRadius: 8,
            backgroundColor: theme.colors.surfaceVariant,
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

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
        <Ionicons name="people" size={16} color={theme.colors.onSurface} style={{ marginRight: 6 }} />
        <Text style={styles.tinyText}>{savedCount} Saves</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <Text style={styles.tinyText}>Collection - {collection.userVerses?.length ?? 0} {(collection.userVerses?.length ?? 0) === 1 ? 'verse' : 'verses'}</Text>
        <Text style={styles.tinyText}>@{collection.authorUsername}</Text>
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


