import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Collection, useAppStore, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface SaveVerseToCollectionSheetProps {
  visible: boolean;
  verse: Verse | null;
  collections: Collection[];
  pickedCollection: Collection | undefined;
  setPickedCollection: (c: Collection | undefined) => void;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
  onCreateNewCollection?: (title: string) => Promise<void>;
  creatingNewCollection?: boolean;
}

export default function SaveVerseToCollectionSheet({ visible, verse, collections, pickedCollection, setPickedCollection, loading, onCancel, onConfirm, confirming, onCreateNewCollection, creatingNewCollection }: SaveVerseToCollectionSheetProps) {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');

  // Filter to only show collections owned by the user
  const userOwnedCollections = useMemo(() => {
    return collections.filter(col => {
      const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
      const owner = col.username ? normalize(col.username) : undefined;
      const author = col.authorUsername ? normalize(col.authorUsername) : undefined;
      const currentUser = normalize(user?.username);
      
      // Collection is owned by user if username matches OR authorUsername matches (and username is not set or also matches)
      return (owner === currentUser) || (author === currentUser && (!owner || owner === currentUser));
    });
  }, [collections, user?.username]);

  if (!verse) return null;

  const handleInputChange = (text: string) => {
    setNewCollectionTitle(text);
    // Clear selected collection when user starts typing
    if (text.trim() && pickedCollection) {
      setPickedCollection(undefined);
    }
  };

  const handleCollectionSelect = (collection: Collection) => {
    setPickedCollection(collection);
    // Clear input when selecting an existing collection
    setNewCollectionTitle('');
  };

  const handleCreateNewCollection = async () => {
    if (!onCreateNewCollection || !newCollectionTitle.trim()) return;
    await onCreateNewCollection(newCollectionTitle.trim());
    setNewCollectionTitle('');
  };

  const handleCancel = () => {
    setNewCollectionTitle('');
    setPickedCollection(undefined);
    onCancel();
  };

  const hasInputText = newCollectionTitle.trim().length > 0;
  const canCreate = hasInputText && onCreateNewCollection && !creatingNewCollection;
  const canSave = pickedCollection && !confirming;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, width: '85%', maxHeight: '70%' }}>
          <Text style={{ fontFamily: 'Noto Serif bold', fontSize: 20, color: theme.colors.onBackground, marginBottom: 20 }}>
            Save Verse
          </Text>
          <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 12, fontFamily: 'Inter' }}>{verse.verse_reference}</Text>
          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <>
              {onCreateNewCollection && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: theme.colors.onBackground, marginBottom: 8, fontFamily: 'Inter', fontWeight: '600' }}>
                    New Collection Title
                  </Text>
                  <TextInput
                    value={newCollectionTitle}
                    onChangeText={handleInputChange}
                    placeholder="Enter title to create new collection"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.onSurfaceVariant,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      fontFamily: 'Inter',
                      color: theme.colors.onBackground,
                      backgroundColor: theme.colors.background,
                    }}
                  />
                </View>
              )}
              <Text style={{ fontSize: 14, color: theme.colors.onBackground, marginBottom: 8, fontFamily: 'Inter', fontWeight: '600' }}>
                Or select existing collection
              </Text>
              <FlatList
                data={userOwnedCollections}
                keyExtractor={(c) => String(c.collectionId)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleCollectionSelect(item)}
                    style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, backgroundColor: pickedCollection?.collectionId === item.collectionId ? theme.colors.primary : 'transparent', borderRadius: 8 }}
                  >
                    <Text style={{ ...styles.tinyText, fontSize: 16, color: pickedCollection?.collectionId === item.collectionId ? '#fff' : theme.colors.onBackground }}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>You have no collections yet.</Text>}
                style={{ maxHeight: 250 }}
              />
            </>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }} onPress={handleCancel}>
              <Text style={{ ...styles.tinyText, color: theme.colors.onBackground }}>Cancel</Text>
            </TouchableOpacity>
            {hasInputText ? (
              <TouchableOpacity
                onPress={handleCreateNewCollection}
                disabled={!canCreate}
                style={{ backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, opacity: canCreate ? 1 : 0.5 }}
              >
                {creatingNewCollection ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ ...styles.tinyText, color: '#fff' }}>Create</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onConfirm}
                disabled={!canSave}
                style={{ backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, opacity: canSave ? 1 : 0.5 }}
              >
                {confirming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ ...styles.tinyText, color: '#fff' }}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}




