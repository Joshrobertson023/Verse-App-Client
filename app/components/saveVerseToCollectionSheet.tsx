import React from 'react';
import { ActivityIndicator, FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Collection, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

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
}

export default function SaveVerseToCollectionSheet({ visible, verse, collections, pickedCollection, setPickedCollection, loading, onCancel, onConfirm, confirming }: SaveVerseToCollectionSheetProps) {
  const styles = useStyles();
  const theme = useAppTheme();

  if (!verse) return null;

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
            <FlatList
              data={collections}
              keyExtractor={(c) => String(c.collectionId)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setPickedCollection(item)}
                  style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, backgroundColor: pickedCollection?.collectionId === item.collectionId ? theme.colors.primary : 'transparent', borderRadius: 8 }}
                >
                  <Text style={{ ...styles.tinyText, fontSize: 16, color: pickedCollection?.collectionId === item.collectionId ? '#fff' : theme.colors.onBackground }}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>You have no collections yet.</Text>}
              style={{ maxHeight: 300 }}
            />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }} onPress={onCancel}>
              <Text style={{ ...styles.tinyText, color: theme.colors.onBackground }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={!pickedCollection || confirming}
              style={{ backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, opacity: (!pickedCollection || confirming) ? 0.5 : 1 }}
            >
              {confirming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ ...styles.tinyText, color: '#fff' }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}




