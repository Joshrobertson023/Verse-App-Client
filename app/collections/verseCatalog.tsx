import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Divider } from 'react-native-paper';
import { Category, getAllCategories } from '../db';
import { useAppStore, UserVerse, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { buildVerseOrderStringFromVerses } from '../utils/collectionUtils';

export default function VerseCatalogScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);
  
  const user = useAppStore((state) => state.user);
  const newCollection = useAppStore((state) => state.newCollection);
  const editingCollection = useAppStore((state) => state.editingCollection);
  const addUserVerseToCollection = useAppStore((state) => state.addUserVerseToCollection);
  const setEditingCollection = useAppStore((state) => state.setEditingCollection);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Verse Catalog',
      headerStyle: {
        backgroundColor: theme.colors.background,
      },
      headerTintColor: theme.colors.onBackground,
    });
  }, [navigation, theme]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await getAllCategories();
        setCategories(cats);
        setSelectedCategoryId(null);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  const handleAddVerse = (verse: Verse) => {
    const userVerse: UserVerse = {
      username: user.username,
      readableReference: verse.verse_reference,
      verses: [verse],
    };

    if (editingCollection) {
      const existingVerse = editingCollection.userVerses?.find(
        (uv) => uv.readableReference === userVerse.readableReference
      );
      if (existingVerse) {
        return;
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
        return;
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Category List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
      >
        {loadingCategories ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          categories.map((category, index) => (
            <React.Fragment key={category.categoryId}>
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: './verseCatalog/[categoryId]',
                  params: { categoryId: category.categoryId.toString() }
                })}
                activeOpacity={0.1}
                style={{
                  paddingVertical: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ ...styles.tinyText, fontSize: 18, fontWeight: 100, marginBottom: 0 }}>
                  {category.name}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.onBackground} style={{ opacity: 0.7 }} />
              </TouchableOpacity>
              {index < categories.length - 1 && <Divider />}
            </React.Fragment>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Verses List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
      >
        {selectedCategoryId === null ? (
          null
        ) : loadingVerses ? (
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
      </ScrollView>
    </View>
  );
}

