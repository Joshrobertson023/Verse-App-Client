import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import ExploreCollectionCard from '../../components/exploreCollectionCard';
import { Skeleton } from '../../components/skeleton';
import { Category, getAllCategories, getCollectionsByCategory, getPopularPublishedCollections, PublishedCollection } from '../../db';
import useStyles from '../../styles';
import useAppTheme from '../../theme';

export default function CategoryCollectionsScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const categoryId = params.categoryId ? parseInt(params.categoryId) : null;
  
  const [categoryName, setCategoryName] = useState<string>('');
  const [collections, setCollections] = useState<PublishedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Attach category names to PublishedCollection for efficient display
  const attachCategoryNames = useCallback((cols: PublishedCollection[], cats: Category[]) => {
    if (!Array.isArray(cols) || !Array.isArray(cats) || cats.length === 0) return cols;
    const idToName = new Map<number, string>(cats.map(c => [c.categoryId, c.name]));
    return cols.map(c => {
      const names = (c.categoryIds || []).map(id => idToName.get(id)).filter((n): n is string => !!n);
      return { ...c, categoryNames: names };
    }) as PublishedCollection[];
  }, []);

  useEffect(() => {
    const loadCategoryName = async () => {
      try {
        const cats = await getAllCategories();
        setCategories(cats);
        const category = cats.find(c => c.categoryId === categoryId);
        if (category) {
          setCategoryName(category.name);
        }
      } catch (error) {
        console.error('Failed to load category name:', error);
      }
    };
    
    if (categoryId) {
      loadCategoryName();
    }
  }, [categoryId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: categoryName || 'Category',
      headerStyle: {
        backgroundColor: theme.colors.background,
      },
      headerTintColor: theme.colors.onBackground,
    });
  }, [navigation, theme, categoryName]);

  const loadCollections = useCallback(async (isRefresh = false) => {
    if (categoryId === null) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Load categories if not already loaded
      let cats = categories;
      if (cats.length === 0) {
        cats = await getAllCategories();
        setCategories(cats);
      }
      
      const cols = await getCollectionsByCategory(categoryId);
      const sorted = [...cols].sort((a, b) => {
        const savesA = typeof a.numSaves === 'number' ? a.numSaves : 0;
        const savesB = typeof b.numSaves === 'number' ? b.numSaves : 0;
        return savesB - savesA;
      });
      setCollections(attachCategoryNames(sorted, cats));
    } catch (error) {
      console.error('Failed to load collections:', error);
      setCollections([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [categoryId, attachCategoryNames, categories]);

  useEffect(() => {
    if (categoryId !== null) {
      loadCollections();
    }
  }, [categoryId]);

  const handleCollectionSaved = async (_id: number) => {
    try {
      await loadCollections(true);
    } catch (e) {
      // ignore refresh failure
    }
  };

  if (categoryId === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ ...styles.text, color: theme.colors.onSurfaceVariant }}>
          Invalid category
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCollections(true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <View key={`skeleton-${i}`} style={{ width: '100%' }}>
                <Skeleton width="100%" height={140} borderRadius={14} />
              </View>
            ))}
          </View>
        ) : collections.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ ...styles.text, color: theme.colors.onSurfaceVariant }}>
              No collections found in this category yet.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {collections.map((collection) => (
              <ExploreCollectionCard
                key={collection.publishedId}
                collection={collection}
                onSaved={handleCollectionSaved}
                fullWidth={true}
              />
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

