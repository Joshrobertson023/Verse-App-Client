import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getVersesInCategory, Category, getAllCategories } from '../../db';
import { useAppStore, UserVerse, Verse } from '../../store';
import useStyles from '../../styles';
import useAppTheme from '../../theme';
import { buildVerseOrderStringFromVerses } from '../../utils/collectionUtils';

export default function CategoryVersesScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const categoryId = params.categoryId ? parseInt(params.categoryId) : null;
  
  const [categoryName, setCategoryName] = useState<string>('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(true);
  
  const user = useAppStore((state) => state.user);
  const newCollection = useAppStore((state) => state.newCollection);
  const editingCollection = useAppStore((state) => state.editingCollection);
  const addUserVerseToCollection = useAppStore((state) => state.addUserVerseToCollection);
  const setEditingCollection = useAppStore((state) => state.setEditingCollection);

  useEffect(() => {
    const loadCategoryName = async () => {
      try {
        const categories = await getAllCategories();
        const category = categories.find(c => c.categoryId === categoryId);
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
      title: categoryName || 'Category Verses',
      headerStyle: {
        backgroundColor: theme.colors.background,
      },
      headerTintColor: theme.colors.onBackground,
    });
  }, [navigation, theme, categoryName]);

  useEffect(() => {
    if (categoryId !== null) {
      const loadVerses = async () => {
        try {
          setLoadingVerses(true);
          // Fetch a large number of verses (1000 should be enough)
          const versesData = await getVersesInCategory(categoryId, 1000);
          setVerses(versesData);
        } catch (error) {
          console.error('Failed to load verses:', error);
          setVerses([]);
        } finally {
          setLoadingVerses(false);
        }
      };
      loadVerses();
    }
  }, [categoryId]);

  const handleAddVerse = (verse: Verse) => {
    const userVerse: UserVerse = {
      username: user.username,
      readableReference: verse.verse_reference,
      verses: [verse],
    };

    // Check if we're editing an existing collection or creating a new one
    if (editingCollection) {
      // For editing collection, we need to check if it already exists
      const existingVerse = editingCollection.userVerses?.find(
        (uv) => uv.readableReference === userVerse.readableReference
      );
      if (existingVerse) {
        return; // Already in collection
      }
      // Add to editing collection
      const updatedUserVerses = [...(editingCollection.userVerses || []), userVerse];
      const updatedVerseOrder = buildVerseOrderStringFromVerses(updatedUserVerses);
      setEditingCollection({
        ...editingCollection,
        userVerses: updatedUserVerses,
        verseOrder: updatedVerseOrder,
      });
    } else {
      // For new collection
      const existingVerse = newCollection.userVerses.find(
        (r) => r.readableReference === userVerse.readableReference
      );
      if (existingVerse) {
        return; // Already in collection
      }
      addUserVerseToCollection(userVerse);
    }
  };

  const isVerseInCollection = (verse: Verse): boolean => {
    const reference = verse.verse_reference;
    if (editingCollection) {
      return editingCollection.userVerses?.some(
        (uv) => uv.readableReference === reference
      ) ?? false;
    } else {
      return newCollection.userVerses.some(
        (uv) => uv.readableReference === reference
      );
    }
  };

  if (categoryId === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ ...styles.text, color: theme.colors.onSurfaceVariant }}>
          Invalid category
        </Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 12, backgroundColor: theme.colors.primary, borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: theme.colors.onPrimary, fontFamily: 'Inter', fontWeight: '600' }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Verses List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
      >
        {loadingVerses ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : verses.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ ...styles.text, color: theme.colors.onSurfaceVariant }}>
              No verses found in this category
            </Text>
          </View>
        ) : (
          verses.map((verse, index) => {
            const isAdded = isVerseInCollection(verse);
            return (
              <View key={verse.id || index} style={{ paddingTop: 10, flex: 1 }}>
                <Text
                  style={{
                    ...styles.text,
                    fontFamily: 'Noto Serif bold',
                    fontWeight: '300',
                    marginBottom: 10,
                  }}
                >
                  {verse.verse_reference}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ width: '85%' }}>
                    <Text
                      style={{
                        ...styles.text,
                        fontFamily: 'Noto Serif',
                        alignContent: 'flex-start',
                      }}
                    >
                      {verse.text}
                    </Text>
                  </View>
                  <View style={{ width: '15%', alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity
                      style={{
                        ...styles.button_filled,
                        borderRadius: 30,
                        width: 40,
                        height: 40,
                        backgroundColor: isAdded ? theme.colors.surface2 : '#FFFFFF',
                      }}
                      onPress={() => handleAddVerse(verse)}
                      disabled={isAdded}
                    >
                      {isAdded ? (
                        <Ionicons name="checkmark" size={28} color={theme.colors.onSurfaceVariant} />
                      ) : (
                        <Ionicons name="add" size={28} color={theme.colors.onBackground} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'flex-start' }}>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <Ionicons name="people" size={20} color={theme.colors.onBackground} />
                    <Text
                      style={{
                        ...styles.text,
                        fontFamily: 'Inter',
                        margin: 0,
                        padding: 0,
                        fontSize: 12,
                        marginBottom: 0,
                        marginLeft: 5,
                      }}
                    >
                      {verse.users_Saved_Verse ?? 0} {verse.users_Saved_Verse === 1 ? 'save' : 'saves'}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <Ionicons name="checkmark-done" size={20} color={theme.colors.onBackground} />
                    <Text
                      style={{
                        ...styles.text,
                        fontFamily: 'Inter',
                        margin: 0,
                        padding: 0,
                        fontSize: 12,
                        marginBottom: 0,
                        marginLeft: 5,
                      }}
                    >
                      {verse.users_Memorized ?? 0} memorized
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

