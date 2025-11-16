import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DataTable } from 'react-native-paper';
import { useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { Category, createCategory, deleteCategory, getAllCategories, getCategoryVerses } from '../db';

export default function CategoriesManagementScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryVerseCounts, setCategoryVerseCounts] = useState<Map<number, number>>(new Map());

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await getAllCategories();
      setCategories(data);
      
      // Load verse counts for each category
      const counts = new Map<number, number>();
      for (const category of data) {
        try {
          const verses = await getCategoryVerses(category.categoryId);
          counts.set(category.categoryId, verses.length);
        } catch (e) {
          console.error(`Failed to load verse count for category ${category.categoryId}:`, e);
          counts.set(category.categoryId, 0);
        }
      }
      setCategoryVerseCounts(counts);
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      alert('Please enter a category name');
      return;
    }
    try {
      await createCategory(name);
      setNewCategoryName('');
      await loadCategories();
      alert('Category created');
    } catch (e) {
      alert('Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteCategory(id);
      await loadCategories();
      alert('Category deleted');
    } catch (e) {
      alert('Failed to delete category');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.colors.onBackground, marginBottom: 20, fontFamily: 'Inter' }}>
            Manage Categories
          </Text>

          {/* Add Category Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Add Category
            </Text>

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
              placeholder="New category name"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TouchableOpacity
              style={styles.button_filled}
              onPress={handleAddCategory}
              disabled={loadingCategories}
            >
              {loadingCategories ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText_filled}>Add</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Categories List */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Categories
            </Text>

            {loadingCategories ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header style={{ backgroundColor: theme.colors.background }}>
                    <DataTable.Title style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>ID</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Name</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 120 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Verses</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Actions</Text></DataTable.Title>
                  </DataTable.Header>

                  {categories.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={{ minWidth: 620 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>No categories</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    categories.map((c) => (
                      <DataTable.Row key={c.categoryId}>
                        <DataTable.Cell style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{c.categoryId}</Text></DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{c.name}</Text></DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 120 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{categoryVerseCounts.get(c.categoryId) ?? 0}</Text></DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 200 }}>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => router.push(`/admin/categories/${c.categoryId}`)}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: theme.colors.primary
                              }}
                            >
                              <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                                Manage Verses
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteCategory(c.categoryId)}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: 'red'
                              }}
                            >
                              <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                            </TouchableOpacity>
                          </View>
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

