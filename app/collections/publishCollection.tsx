import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Chip, Dialog, Portal, TextInput } from 'react-native-paper';
import { Category, getAllCategories, getUserVersesPopulated, publishCollection } from '../db';
import { useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

export default function PublishCollection() {
  const styles = useStyles();
  const theme = useAppTheme();
  const [errorMessage, setErrorMessage] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [displayUserVerses, setDisplayUserVerses] = useState<UserVerse[]>([]);
  const setPublishingCollection = useAppStore((state) => state.setPublishingCollection);
  const setCollectionReviewMessage = useAppStore((state) => state.setCollectionReviewMessage);

  // Get collection from store
  const publishingCollection = useAppStore((state) => state.publishingCollection);

  useEffect(() => {
    (async () => {
      try {
        const cats = await getAllCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    })();
  }, []);

  // Load and populate userVerses
  useEffect(() => {
    if (!publishingCollection) return;

    // Check if userVerses are already populated
    if (publishingCollection.userVerses && publishingCollection.userVerses.every(uv => uv.verses?.length > 0)) {
      // Order by verseOrder if it exists
      const sorted = orderByVerseOrder(publishingCollection.userVerses, publishingCollection.verseOrder);
      setDisplayUserVerses(sorted);
    } else {
      // Fetch populated user verses
      const fetchPopulated = async () => {
        setLoadingVerses(true);
        try {
          const colToSend = { ...publishingCollection, UserVerses: publishingCollection.userVerses ?? [] };
          const data = await getUserVersesPopulated(colToSend);
          // Order by verseOrder before setting
          const sorted = orderByVerseOrder(data.userVerses ?? [], data.verseOrder);
          setDisplayUserVerses(sorted);
        } catch (err) {
          console.error(err);
          setDisplayUserVerses(publishingCollection.userVerses || []);
        } finally {
          setLoadingVerses(false);
        }
      };
      
      fetchPopulated();
    }
  }, [publishingCollection]);

  // Order verses by verseOrder
  function orderByVerseOrder(userVerses: UserVerse[], verseOrder?: string): UserVerse[] {
    if (!verseOrder) return userVerses;
    
    const orderArray = verseOrder.split(',').filter(ref => ref.trim() !== '');
    const ordered: UserVerse[] = [];
    const unordered: UserVerse[] = [];
    
    // Create a map for quick lookup
    const verseMap = new Map<string, UserVerse>();
    userVerses.forEach(uv => {
      verseMap.set(uv.readableReference, uv);
    });
    
    // First, add verses in the order specified
    orderArray.forEach(ref => {
      const verse = verseMap.get(ref.trim());
      if (verse) {
        ordered.push(verse);
        verseMap.delete(ref.trim());
      }
    });
    
    // Then add any verses not in the order
    verseMap.forEach(verse => {
      unordered.push(verse);
    });
    
    return [...ordered, ...unordered];
  }

  // Clean up editing state on unmount
  useEffect(() => {
    return () => {
      setPublishingCollection(undefined);
    };
  }, [setPublishingCollection]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (categoryDialogVisible) {
        setCategoryDialogVisible(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [categoryDialogVisible]);

  const toggleCategory = (id: number) => {
    const next = new Set(selectedCategoryIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCategoryIds(next);
  };

  const handlePublish = async () => {
    if (!publishingCollection?.collectionId) return;

    setPublishing(true);
    setErrorMessage('');

    try {
      // Use the collection with populated userVerses from displayUserVerses
      // Ensure notes are included and verseOrder respects the draft order
      const collectionToPublish = {
        ...publishingCollection,
        userVerses: displayUserVerses.length > 0 ? displayUserVerses : publishingCollection.userVerses || [],
        notes: publishingCollection.notes || [],
        // verseOrder should already include notes from the draft, but ensure it's set
        verseOrder: publishingCollection.verseOrder || ''
      };
      
      const message = await publishCollection(
        collectionToPublish,
        description.trim() || '',
        Array.from(selectedCategoryIds)
      );
      setPublishingCollection(undefined);
      // Set review message in store to display on index.tsx
      setCollectionReviewMessage(message);
      // Navigate to home page
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Failed to publish collection:', error);
      setErrorMessage(error?.message || 'Failed to publish collection');
    } finally {
      setPublishing(false);
    }
  };

  if (!publishingCollection) {
    return (
      <View style={{ ...styles.container, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  const selectedCategories = categories.filter(c => selectedCategoryIds.has(c.categoryId));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 100,
          paddingHorizontal: 20,
          paddingTop: 20,
          width: '100%'
        }}
      >
        <View style={{ ...styles.input, height: 80, justifyContent: 'center', padding: 12, backgroundColor: theme.colors.surface }} >
          <Text style={{ ...styles.tinyText, marginBottom: 4, opacity: 0.7 }}>Collection Title</Text>
          <Text style={{ ...styles.text, color: theme.colors.onSurface }}>{publishingCollection.title}</Text>
        </View>

        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          style={{...styles.input, height: 60, padding: -10, paddingBottom: -30}}
          mode="outlined"
          multiline={true}
          numberOfLines={4}
          maxLength={200}
        />

        <TouchableOpacity
          style={{ ...styles.button_outlined, width: '100%', marginBottom: 15 }}
          onPress={() => setCategoryDialogVisible(true)}
        >
          <Text style={{ ...styles.buttonText_outlined }}>Choose Categories</Text>
        </TouchableOpacity>

        {selectedCategories.length > 0 && (
          <View style={{ width: '100%', marginBottom: 15 }}>
            <Text style={{ ...styles.tinyText, marginBottom: 8 }}>Selected Categories:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {selectedCategories.map(category => (
                <Chip
                  key={category.categoryId}
                  onClose={() => toggleCategory(category.categoryId)}
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <Text style={styles.tinyText}>
                    {category.name}
                  </Text>
                </Chip>
              ))}
            </View>
          </View>
        )}

        {/* User Verse Cards */}
        {loadingVerses ? (
          <View style={{ width: '100%', alignItems: 'center', marginTop: 20 }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : displayUserVerses.length > 0 && (
          <View style={{ marginTop: 20, width: '100%' }}>
            {displayUserVerses.map((userVerse) => (
              <View key={userVerse.readableReference} style={{ width: '100%', marginBottom: 20 }}>
                <View style={{ width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }}>
                  <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600, marginBottom: 8 }}>
                    {userVerse.readableReference}
                  </Text>
                  {userVerse.verses.map((verse) => (
                    <View key={verse.verse_reference}>
                      <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 18 }}>
                        {verse.verse_Number ? verse.verse_Number + ": " : ''}{verse.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

        <View style={{ height: 120 }}></View>
      </ScrollView>

      <View
        style={{
          ...styles.button_filled,
          position: 'absolute',
          bottom: 60,
          width: '90%',
          zIndex: 10,
          alignSelf: 'center',
          backgroundColor: theme.colors.onPrimary,
          boxShadow: '0px 0px 23px 10px rgba(0,0,0,.2)'
        }}
      ></View>

      <TouchableOpacity
        style={{
          ...styles.button_filled,
          position: 'absolute',
          bottom: 60,
          zIndex: 10,
          marginHorizontal: 20,
          width: '90%',
          alignSelf: 'center'
        }}
        activeOpacity={0.1}
        onPress={handlePublish}
        disabled={publishing}
      >
        {publishing ? (
          <Text style={styles.buttonText_filled}>
            <ActivityIndicator animating={true} color={theme.colors.background} />
          </Text>
        ) : (
          <Text style={styles.buttonText_filled}>Publish Collection</Text>
        )}
      </TouchableOpacity>

      <Portal>
        <Dialog
          visible={categoryDialogVisible}
          onDismiss={() => setCategoryDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface2 }}
        >
          <Dialog.Title>Select Categories</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 300 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map(category => (
                  <Chip
                    key={category.categoryId}
                    selected={selectedCategoryIds.has(category.categoryId)}
                    onPress={() => toggleCategory(category.categoryId)}
                    style={{
                      marginBottom: 8,
                      backgroundColor: selectedCategoryIds.has(category.categoryId)
                        ? theme.colors.surface2
                        : theme.colors.surface2
                    }}
                  >
                    <Text style={styles.tinyText}>
                      {category.name}
                    </Text>
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <TouchableOpacity
              style={{ ...styles.button_outlined, width: 100, height: 30 }}
              onPress={() => setCategoryDialogVisible(false)}
            >
              <Text style={{ ...styles.buttonText_outlined }}>Done</Text>
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

