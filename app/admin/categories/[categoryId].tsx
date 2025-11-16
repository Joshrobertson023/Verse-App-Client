import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DataTable } from 'react-native-paper';
import { useAppStore } from '../../store';
import useStyles from '../../styles';
import useAppTheme from '../../theme';
import { Category, getAllCategories, getCategoryVerses, addVerseToCategory, deleteVerseFromCategory } from '../../db';

interface CategoryVerse {
  verseReference: string;
}

export default function CategoryDetailScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId: string }>();
  const categoryId = params.categoryId ? parseInt(params.categoryId, 10) : null;
  const [category, setCategory] = useState<Category | null>(null);
  const [verses, setVerses] = useState<CategoryVerse[]>([]);
  const [newVerseReference, setNewVerseReference] = useState('');
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);

  const loadCategory = useCallback(async () => {
    if (!categoryId) return;
    setLoadingCategory(true);
    try {
      const categories = await getAllCategories();
      const found = categories.find(c => c.categoryId === categoryId);
      setCategory(found || null);
    } catch (e) {
      console.error('Failed to load category:', e);
    } finally {
      setLoadingCategory(false);
    }
  }, [categoryId]);

  const loadVerses = useCallback(async () => {
    if (!categoryId) return;
    setLoadingVerses(true);
    try {
      const data = await getCategoryVerses(categoryId);
      const categoryVerses: CategoryVerse[] = data.map(v => ({ verseReference: v }));
      setVerses(categoryVerses);
    } catch (e) {
      console.error('Failed to load verses:', e);
    } finally {
      setLoadingVerses(false);
    }
  }, [categoryId]);

  useFocusEffect(
    useCallback(() => {
      loadCategory();
      loadVerses();
    }, [loadCategory, loadVerses])
  );

  const handleAddVerse = async () => {
    if (!categoryId || !newVerseReference.trim()) {
      alert('Please enter a verse reference');
      return;
    }
    try {
      await addVerseToCategory(categoryId, newVerseReference.trim());
      setNewVerseReference('');
      await loadVerses();
      alert('Verse added to category');
    } catch (e: any) {
      alert(e.message || 'Failed to add verse to category');
    }
  };

  const handleDeleteVerse = async (verseReference: string) => {
    if (!categoryId) return;
    try {
      await deleteVerseFromCategory(categoryId, verseReference);
      await loadVerses();
      alert('Verse removed from category');
    } catch (e: any) {
      alert(e.message || 'Failed to remove verse from category');
    }
  };

  if (!categoryId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Invalid category ID</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>
          {loadingCategory ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text style={{ fontSize: 24, fontWeight: '700', color: theme.colors.onBackground, marginBottom: 20, fontFamily: 'Inter' }}>
              {category?.name || 'Category'} - Manage Verses
            </Text>
          )}

          {/* Add Verse Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Add Verse
            </Text>

            <View style={{ marginBottom: 10 }}>
              <TextInput
                style={{
                  width: '100%',
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  color: theme.colors.onBackground,
                  fontSize: 16,
                  marginBottom: 10
                }}
                placeholder="e.g., John 3:16 or John 3:16-18"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={newVerseReference}
                onChangeText={setNewVerseReference}
              />
              <TouchableOpacity
                style={styles.button_filled}
                onPress={handleAddVerse}
                disabled={loadingVerses}
              >
                {loadingVerses ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText_filled}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter', marginTop: 4 }}>
              Verse reference will be normalized to standard format (e.g., "John 3:16")
            </Text>
          </View>

          {/* Verses List */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Verses in Category ({verses.length})
            </Text>

            {loadingVerses ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header style={{ backgroundColor: theme.colors.background }}>
                    <DataTable.Title style={{ minWidth: 300 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Verse Reference</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 120 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Action</Text></DataTable.Title>
                  </DataTable.Header>

                  {verses.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={{ minWidth: 420 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>No verses in this category</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    verses.map((v, index) => (
                      <DataTable.Row key={index}>
                        <DataTable.Cell style={{ minWidth: 300 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{v.verseReference}</Text></DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 120 }}>
                          <TouchableOpacity
                            onPress={() => handleDeleteVerse(v.verseReference)}
                            style={{
                              padding: 6,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: 'red'
                            }}
                          >
                            <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                          </TouchableOpacity>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

