import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Chip, Searchbar, Snackbar } from 'react-native-paper';
import ExploreCollectionCard from '../components/exploreCollectionCard';
import ShareVerseSheet from '../components/shareVerseSheet';
import { SearchResultSkeleton } from '../components/skeleton';
import { addUserVersesToNewCollection, checkRelationship, createCollectionDB, getMostRecentCollectionId, getPopularSearches, getUserCollections, getVerseSearchResult, PublishedCollection, refreshUser, searchPublishedCollections, searchUsers, sendFriendRequest, trackSearch, updateCollectionDB, updateCollectionsOrder } from '../db';
import { Collection, SearchData, useAppStore, User, UserVerse, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const RECENT_SEARCHES_KEY = '@verseApp:recentSearches';

type SearchTab = 'passages' | 'collections' | 'people';

export default function SearchScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const verseSaveAdjustments = useAppStore((state) => state.verseSaveAdjustments);
  const incrementVerseSaveAdjustment = useAppStore((state) => state.incrementVerseSaveAdjustment);
  const popularSearches = useAppStore((state) => state.popularSearches);
  const setPopularSearches = useAppStore((state) => state.setPopularSearches);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('passages');
  const [loading, setLoading] = useState(false);
  const [passageResults, setPassageResults] = useState<(Verse | UserVerse)[]>([]);
  const [peopleResults, setPeopleResults] = useState<User[]>([]);
  const [collectionResults, setCollectionResults] = useState<PublishedCollection[]>([]);
  const [relationships, setRelationships] = useState<Map<string, number>>(new Map());
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [selectedUserVerse, setSelectedUserVerse] = useState<UserVerse | null>(null);
  const [pickedCollection, setPickedCollection] = useState<Collection | undefined>(undefined);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const setUser = useAppStore((state) => state.setUser);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [verseToShare, setVerseToShare] = useState<Verse | null>(null);
  const [userVerseToShare, setUserVerseToShare] = useState<UserVerse | null>(null);

  const normalizedSearchTerm = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery]
  );

  const verseReferenceSet = useMemo(() => {
    const set = new Set<string>();
    passageResults.forEach((item) => {
      if ('verse_reference' in item && item.verse_reference) {
        // Single verse
        set.add(item.verse_reference.trim().toLowerCase());
      } else if ('readableReference' in item && item.readableReference) {
        // UserVerse (passage)
        set.add(item.readableReference.trim().toLowerCase());
      }
    });
    return set;
  }, [passageResults]);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => {
    const loadPopularSearches = async () => {
      try {
        const searches = await getPopularSearches(10);
        setPopularSearches(searches);
      } catch (error) {
        console.error('Failed to load popular searches:', error);
      }
    };

    if (!popularSearches || popularSearches.length === 0) {
      loadPopularSearches();
    }
  }, [popularSearches, setPopularSearches]);

  const loadRecentSearches = async () => {
    try {
      const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (data) {
        const searches = JSON.parse(data);
        setRecentSearches(searches);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const saveRecentSearch = async (searchTerm: string) => {
    try {
      const existing = recentSearches.filter(s => s.toLowerCase() !== searchTerm.toLowerCase());
      const updated = [searchTerm, ...existing].slice(0, 5);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };


  const handleSearch = async (searchTermOverride?: string) => {
    const searchTerm = (searchTermOverride || searchQuery).trim();
    if (!searchTerm) return;
    
    setSearchQuery(searchTerm);
    setHasSearched(true);
    await trackSearch(searchTerm);
    await saveRecentSearch(searchTerm);
    
    setCollectionResults([]);
    setLoading(true);
    try {
      const [passageSearchResult, peopleSearchResults] = await Promise.all([
        getVerseSearchResult(searchTerm).catch(() => ({ verses: [], searched_By_Passage: false, readable_Reference: '' } as SearchData)),
        searchUsers(searchTerm).catch(() => [])
      ]);
      
      const errorMessages = [
        "Error getting chapter.",
        "Invalid reference format.",
        "Error getting verse.",
        "Error getting first verse in range.",
        "Error getting second verse in range.",
        "Not a valid verse",
        "Nothing came back from that search. Please check your spelling.",
        "Invalid search.",
        "Invalid search format."
      ];
      
      // Check for Oracle database errors (ORA-)
      const hasOracleError = passageSearchResult.verses.some((v: Verse) => 
        v.verse_reference?.includes('ORA-') || v.text?.includes('ORA-')
      );
      if (hasOracleError) {
        errorMessages.push('ORA-');
      }
      
      // Check if this is a passage search (multiple verses bundled together)
      if (passageSearchResult.searched_By_Passage && passageSearchResult.verses.length > 0) {
        // Filter out any verses with ORA- errors
        const filteredVerses = passageSearchResult.verses.filter((v: Verse) => 
          !v.verse_reference?.includes('ORA-') && !v.text?.includes('ORA-')
        );
        
        if (filteredVerses.length > 0) {
          // Create a UserVerse for the passage
          const userVerse: UserVerse = {
            username: user.username,
            readableReference: passageSearchResult.readable_Reference || filteredVerses[0].verse_reference || '',
            verses: filteredVerses
          };
          setPassageResults([userVerse]);
        } else {
          setPassageResults([]);
        }
      } else if (passageSearchResult.verses.length === 1) {
        const verse = passageSearchResult.verses[0];
        const verseReference = verse?.verse_reference || "";
        const verseText = verse?.text || "";
        const isError = errorMessages.some(msg => 
          verseReference.includes(msg) || verseText.includes(msg)
        );
        if (isError) {
          setPassageResults([]);
        } else {
          setPassageResults(passageSearchResult.verses);
        }
      } else {
        // Filter out any verses with ORA- errors
        const filteredVerses = passageSearchResult.verses.filter((v: Verse) => 
          !v.verse_reference?.includes('ORA-') && !v.text?.includes('ORA-')
        );
        setPassageResults(filteredVerses);
      }
      
      setPeopleResults(peopleSearchResults);
      
      // For collection search, ungroup UserVerse back into individual verses
      // This ensures we search for collections containing any of the verses in the passage
      // Use passageSearchResult.verses directly since passageResults hasn't been set yet
      const verseReferences: string[] = [];
      
      // Extract all individual verses from the search result
      // If it's a passage search, we want to search for collections containing any of those verses
      passageSearchResult.verses.forEach((verse: Verse) => {
        if (verse.verse_reference && typeof verse.verse_reference === 'string' && verse.verse_reference.trim().length > 0) {
          verseReferences.push(verse.verse_reference);
        }
      });
      
      // Also include the readable reference if it's a passage search (for additional matching)
      if (passageSearchResult.searched_By_Passage && passageSearchResult.readable_Reference) {
        verseReferences.push(passageSearchResult.readable_Reference);
      }

      const collections = await searchPublishedCollections({
        query: searchTerm,
        verseReferences,
        limit: 50,
      });
      setCollectionResults(collections);
      
      const relationshipMap = new Map<string, number>();
      for (const resultUser of peopleSearchResults) {
        if (resultUser.username !== user.username) {
          const relationship = await checkRelationship(user.username, resultUser.username);
          relationshipMap.set(resultUser.username, relationship);
        }
      }
      setRelationships(relationshipMap);
      
      // Collections search implemented later
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetUsername: string) => {
    try {
      await sendFriendRequest(user.username, targetUsername);
      
      setRelationships(prev => {
        const updated = new Map(prev);
        updated.set(targetUsername, 0);
        return updated;
      });
      
      setSnackbarMessage('Friend request sent!');
      setSnackbarVisible(true);
      
      if (searchQuery.trim()) {
        const results = await searchUsers(searchQuery);
        setPeopleResults(results);
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      setSnackbarMessage('Failed to send friend request');
      setSnackbarVisible(true);
    }
  };

  const parseVerseReference = (reference: string) => {
    const parts = reference.split(':');
    if (parts.length < 2) return null;
    
    const versePart = parts[1].trim();
    const bookChapterPart = parts[0].trim();
    const lastSpaceIndex = bookChapterPart.lastIndexOf(' ');
    if (lastSpaceIndex === -1) return null;
    
    const bookName = bookChapterPart.substring(0, lastSpaceIndex).trim();
    const chapter = parseInt(bookChapterPart.substring(lastSpaceIndex + 1).trim());
    const verse = parseInt(versePart);
    
    return { bookName, chapter, verse };
  };

  const handleSaveVerse = (verse: Verse) => {
    setSelectedVerse(verse);
    setSelectedUserVerse(null);
    setPickedCollection(undefined);
    setNewCollectionTitle('');
    setShowCollectionPicker(true);
  };

  const handleSaveUserVerse = (userVerse: UserVerse) => {
    setSelectedUserVerse(userVerse);
    setSelectedVerse(null);
    setPickedCollection(undefined);
    setNewCollectionTitle('');
    setShowCollectionPicker(true);
  };

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
    if ((!selectedVerse && !selectedUserVerse) || !user?.username || isCreatingNewCollection || !newCollectionTitle.trim()) return;
    
    // Check collection limit based on paid status
    const maxCollections = user.isPaid ? 40 : 5;
    if (collections.length >= maxCollections) {
      if (!user.isPaid) {
        router.push('/pro');
        return;
      }
      setSnackbarMessage('You can create up to 40 collections.');
      setSnackbarVisible(true);
      return;
    }

    // Ensure verse_reference is set for single verses
    if (!selectedUserVerse && (!selectedVerse || !selectedVerse.verse_reference)) {
      setSnackbarMessage('Error: Verse reference is missing');
      setSnackbarVisible(true);
      return;
    }
    
    const userVerse: UserVerse = selectedUserVerse || {
      username: user.username,
      readableReference: selectedVerse!.verse_reference,
      verses: [selectedVerse!]
    };

    // Ensure readableReference is set
    if (!userVerse.readableReference || userVerse.readableReference.trim() === '') {
      setSnackbarMessage('Error: Verse reference is invalid');
      setSnackbarVisible(true);
      return;
    }

    setIsCreatingNewCollection(true);

    try {
      const finalTitle = newCollectionTitle.trim() === '' ? 'New Collection' : (newCollectionTitle.trim() === 'Favorites' ? 'Favorites-Other' : newCollectionTitle.trim());
      const verseOrderString = userVerse.readableReference ? `${userVerse.readableReference},` : '';
      const newCollection: Collection = {
        title: finalTitle,
        authorUsername: user.username,
        username: user.username,
        visibility: 'private',
        verseOrder: verseOrderString,
        userVerses: [userVerse],
        notes: [],
        favorites: false,
      };

      await createCollectionDB(newCollection, user.username);
      const collectionId = await getMostRecentCollectionId(user.username);
      await addUserVersesToNewCollection([userVerse], collectionId);
      
      const updatedCollections = await getUserCollections(user.username);
      setCollections(updatedCollections);

      const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
      const newOrder = currentOrder ? `${currentOrder},${collectionId}` : collectionId.toString();
      const updatedUser = { ...user, collectionsOrder: newOrder };
      setUser(updatedUser);
      await updateCollectionsOrder(newOrder, user.username);

      const refreshedUser = await refreshUser(user.username);
      setUser(refreshedUser);

      // Increment save adjustments for all verses in the userVerse
      userVerse.verses.forEach(verse => {
        if (verse.verse_reference) {
          incrementVerseSaveAdjustment(verse.verse_reference);
        }
      });
      
      setShowCollectionPicker(false);
      setSelectedVerse(null);
      setSelectedUserVerse(null);
      setPickedCollection(undefined);
      setNewCollectionTitle('');
      setSnackbarMessage('Collection created and verse saved');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Failed to create collection:', error);
      setSnackbarMessage('Failed to create collection');
      setSnackbarVisible(true);
    } finally {
      setIsCreatingNewCollection(false);
    }
  };

  const handleAddToCollection = async () => {
    if (!pickedCollection || (!selectedVerse && !selectedUserVerse) || !user.username || isAddingToCollection) return;
    
    // Check verse limit per collection for free users
    if (!user.isPaid) {
      const currentVerseCount = pickedCollection.userVerses?.length ?? 0;
      const maxVersesPerCollection = 10;
      
      if (currentVerseCount >= maxVersesPerCollection) {
        router.push('/pro');
        return;
      }
    }
    
    // Ensure verse_reference is set for single verses
    if (!selectedUserVerse && (!selectedVerse || !selectedVerse.verse_reference)) {
      setSnackbarMessage('Error: Verse reference is missing');
      setSnackbarVisible(true);
      return;
    }

    const userVerse: UserVerse = selectedUserVerse || {
      username: user.username,
      readableReference: selectedVerse!.verse_reference,
      verses: [selectedVerse!]
    };
    
    const readableRef = userVerse.readableReference;
    if (!readableRef || readableRef.trim() === '') {
      setSnackbarMessage('Error: Verse reference is invalid');
      setSnackbarVisible(true);
      return;
    }

    const alreadyExists = pickedCollection.userVerses.some(
      uv => uv.readableReference === readableRef
    );

    if (alreadyExists) {
      setSnackbarMessage('This passage is already in the collection');
      setSnackbarVisible(true);
      setShowCollectionPicker(false);
      setSelectedVerse(null);
      setSelectedUserVerse(null);
      setPickedCollection(undefined);
      return;
    }

    setIsAddingToCollection(true);

    try {
      await addUserVersesToNewCollection([userVerse], pickedCollection.collectionId!);
      
      const currentOrder = pickedCollection.verseOrder || '';
      const newOrder = currentOrder ? `${currentOrder}${readableRef},` : `${readableRef},`;
      
      const updatedCollection = {
        ...pickedCollection,
        userVerses: [...pickedCollection.userVerses, userVerse],
        verseOrder: newOrder,
      };
      
      await updateCollectionDB(updatedCollection);
      try {
        const refreshedCollections = await getUserCollections(user.username);
        setCollections(refreshedCollections);
      } catch (error) {
        console.error('Failed to refresh collections after adding verse:', error);
        // fallback to optimistic update if fetch fails
        setCollections(collections.map(c =>
          c.collectionId === pickedCollection.collectionId ? updatedCollection : c
        ));
      }

      // Increment save adjustments for all verses in the userVerse
      userVerse.verses.forEach(verse => {
        if (verse.verse_reference) {
          incrementVerseSaveAdjustment(verse.verse_reference);
        }
      });

      setShowCollectionPicker(false);
      setSelectedVerse(null);
      setSelectedUserVerse(null);
      setPickedCollection(undefined);
      setIsAddingToCollection(false);
      setSnackbarMessage('Verse added to collection!');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Error adding to collection:', error);
      setSnackbarMessage('Failed to add verse to collection');
      setSnackbarVisible(true);
      setIsAddingToCollection(false);
    }
  };

  const handleReadVerse = (verse: Verse) => {
    const parsed = parseVerseReference(verse.verse_reference);
    if (!parsed) {
      setSnackbarMessage('Could not parse verse reference');
      setSnackbarVisible(true);
      return;
    }
    
    const encodedBookName = encodeURIComponent(parsed.bookName);
    router.push(`../book/${encodedBookName}?chapter=${parsed.chapter}`);
  };

  const handleReadUserVerse = (userVerse: UserVerse) => {
    if (userVerse.verses.length === 0) return;
    const firstVerse = userVerse.verses[0];
    const parsed = parseVerseReference(firstVerse.verse_reference);
    if (!parsed) {
      setSnackbarMessage('Could not parse verse reference');
      setSnackbarVisible(true);
      return;
    }
    
    const encodedBookName = encodeURIComponent(parsed.bookName);
    router.push(`../book/${encodedBookName}?chapter=${parsed.chapter}`);
  };

  const renderPassageResult = ({ item }: { item: Verse | UserVerse }) => {
    // Check if it's a UserVerse (passage) or single Verse
    if ('readableReference' in item && 'verses' in item) {
      // It's a UserVerse (passage)
      const userVerse = item as UserVerse;
      
      return (
        <View style={{
          marginVertical: 12,
          borderRadius: 12,
          marginBottom: 25
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.onBackground,
            marginBottom: 12,
            fontFamily: 'Inter'
          }}>
            {userVerse.readableReference}
          </Text>
          
          {/* Render each verse in the passage */}
          {userVerse.verses.map((verse, index) => {
            const savedAdjustment = verseSaveAdjustments[verse.verse_reference] ?? 0;
            const savedCount = (verse.users_Saved_Verse ?? 0) + savedAdjustment;
            const savedLabel = savedCount === 1 ? 'save' : 'saved';
            const memorizedCount = verse.users_Memorized ?? 0;
            const isSingleVerse = userVerse.verses.length === 1;
            
            return (
              <View key={index} style={{ marginBottom: 16 }}>
                {/* Hide verse reference if only one verse in passage */}
                {!isSingleVerse && (
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: theme.colors.onBackground,
                    marginBottom: 6,
                    fontFamily: 'Inter'
                  }}>
                    {verse.verse_reference}
                  </Text>
                )}
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  lineHeight: 20,
                  marginBottom: 8
                }}>
                  {verse.text}
                </Text>
                
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="people-outline" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
                      {savedCount} {savedLabel}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
                      {memorizedCount} memorized
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
          
          {/* Action buttons for the entire passage */}
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
            <TouchableOpacity 
              onPress={() => handleSaveUserVerse(userVerse)}
              activeOpacity={0.1}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="bookmark-outline" size={18} color={theme.colors.onBackground} />
              <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleReadUserVerse(userVerse)}
              activeOpacity={0.1}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="library-outline" size={18} color={theme.colors.onBackground} />
              <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Read</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center' }} 
              activeOpacity={0.1} 
              onPress={() => {
                // Share the entire UserVerse (passage)
                setUserVerseToShare(userVerse);
                setVerseToShare(null);
              }}
            >
              <Ionicons name="share-social-outline" size={18} color={theme.colors.onBackground} />
              <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      // It's a single Verse
      const verse = item as Verse;
      const savedAdjustment = verseSaveAdjustments[verse.verse_reference] ?? 0;
      const savedCount = (verse.users_Saved_Verse ?? 0) + savedAdjustment;
      const savedLabel = savedCount === 1 ? 'save' : 'saved';
      const memorizedCount = verse.users_Memorized ?? 0;

    return (
    <View style={{
      marginVertical: 12,
      borderRadius: 12,
      marginBottom: 25
    }}>
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.onBackground,
        marginBottom: 8,
        fontFamily: 'Inter'
      }}>
            {verse.verse_reference}
      </Text>
      <Text style={{
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
        fontFamily: 'Inter',
        lineHeight: 20
      }}>
            {verse.text}
      </Text>
      
      <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="people-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
            {savedCount} {savedLabel}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
            {memorizedCount} memorized
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
        <TouchableOpacity 
              onPress={() => handleSaveVerse(verse)}
          activeOpacity={0.1}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="bookmark-outline" size={18} color={theme.colors.onBackground} />
          <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity 
              onPress={() => handleReadVerse(verse)}
          activeOpacity={0.1}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="library-outline" size={18} color={theme.colors.onBackground} />
          <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Read</Text>
        </TouchableOpacity>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center' }} 
              activeOpacity={0.1} 
              onPress={() => {
                setVerseToShare(verse);
                setUserVerseToShare(null);
              }}
            >
              <Ionicons name="share-social-outline" size={18} color={theme.colors.onBackground} />
              <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Share</Text>
            </TouchableOpacity>
      </View>
    </View>
  );
    }
  };

  const renderCollectionResult = ({ item }: { item: PublishedCollection }) => (
    <View style={{ paddingHorizontal: 20, marginVertical: 12 }}>
      <ExploreCollectionCard collection={item} fullWidth />
    </View>
  );

  const renderPeopleResult = ({ item }: { item: User }) => {
    const relationshipStatus = relationships.get(item.username) ?? -1;
    const isCurrentUser = item.username === user.username;
    
    let buttonText = 'Add Friend';
    let buttonStyle = { backgroundColor: theme.colors.primary };
    let textColor = theme.colors.onPrimary;
    
    if (relationshipStatus === 1) {
      buttonText = 'Friends';
      buttonStyle = { backgroundColor: theme.colors.surface };
      textColor = theme.colors.onSurfaceVariant;
    } else if (relationshipStatus === 0) {
      buttonText = 'Pending';
      buttonStyle = { backgroundColor: theme.colors.surface };
      textColor = theme.colors.onSurfaceVariant;
    }
    
    if (isCurrentUser) {
      return null; // Don't show if is the current user
    }
    
    return (
      <View style={{
        paddingVertical: 16,
        marginTop: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center'
      }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: theme.colors.onBackground,
          marginRight: 12,
          overflow: 'hidden'
        }}>
          {item.profilePictureUrl ? (
            <Image
              source={{ uri: item.profilePictureUrl }}
              style={{ width: 48, height: 48 }}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="person" size={24} color={theme.colors.onBackground} />
          )}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.onBackground,
            fontFamily: 'Inter'
          }}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={{
            fontSize: 14,
            color: theme.colors.onSurfaceVariant,
            fontFamily: 'Inter'
          }}>
            @{item.username}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={() => handleSendFriendRequest(item.username)}
          disabled={relationshipStatus === 1 || relationshipStatus === 0}
          activeOpacity={0.1}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            opacity: (relationshipStatus === 1 || relationshipStatus === 0) ? 0.5 : 1,
            ...buttonStyle
          }}
        >
          <Text style={{
            color: theme.colors.background,
            fontFamily: 'Inter',
            fontWeight: '600'
          }}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, marginTop: 30 }}>
        <View style={{ padding: 20 }}>
          <Searchbar
            placeholder="Search"
            onChangeText={(value) => {
              setSearchQuery(value);
              if (value === '') {
                setHasSearched(false);
                setPassageResults([]);
                setPeopleResults([]);
              }
            }}
            value={searchQuery}
            onClearIconPress={() => {
              setSearchQuery('');
              setHasSearched(false);
              setPassageResults([]);
              setPeopleResults([]);
            }}
            onSubmitEditing={() => handleSearch()}
            style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}
          />
          <TouchableOpacity
            onPress={() => handleSearch()}
            disabled={loading || !searchQuery.trim()}
            activeOpacity={0.1}
            style={{
              ...styles.button_outlined,
              marginBottom: 8,
              opacity: loading || !searchQuery.trim() ? 0.5 : 1,
              borderColor: theme.colors.onSurface,
              borderWidth: 1
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.onBackground} />
            ) : (
              <Text style={styles.buttonText_outlined}>
                Search
              </Text>
            )}
          </TouchableOpacity>
          {!hasSearched && (
            <Text style={{
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              fontFamily: 'Inter',
              marginBottom: 16
            }}>
              Search the Bible, published collections, or people
            </Text>
          )}
        </View>

        {/* Recent and popular searches */}
        {!hasSearched && !loading && (
          <ScrollView style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 20 }}>
              {recentSearches.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    ...styles.text,
                    fontSize: 22,
                    fontFamily: 'Inter bold',
                    color: theme.colors.onBackground,
                    marginBottom: 12,
                  }}>
                    Recent searches
                  </Text>
                  {recentSearches.map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.1}
                      onPress={() => {
                        setSearchQuery(search);
                        handleSearch(search);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12
                      }}
                    >
                      <Text style={{
                        fontSize: 16,
                        color: theme.colors.onBackground,
                        fontFamily: 'Inter'
                      }}>
                        {search}
                      </Text>
                      <View style={{flexDirection: 'row', gap: 10}}>
                        <Ionicons name="refresh-outline" size={20} color={theme.colors.onSurfaceVariant} />
                        <Ionicons name="open-outline" size={20} color={theme.colors.onSurfaceVariant} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {popularSearches.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    ...styles.text,
                    fontSize: 22,
                    fontFamily: 'Inter bold',
                    color: theme.colors.onBackground,
                    marginBottom: 12,
                  }}>
                    Popular searches
                  </Text>
                  {popularSearches.map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.1}
                      onPress={() => {
                        setSearchQuery(search);
                        handleSearch(search);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12
                      }}
                    >
                      <Text style={{
                        fontSize: 16,
                        color: theme.colors.onBackground,
                        fontFamily: 'Inter',
                        marginRight: 10
                      }}>
                        {search}
                      </Text>
                      <Ionicons name="open-outline" size={20} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Chips */}
        {hasSearched && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip
                selected={activeTab === 'passages'}
                onPress={() => setActiveTab('passages')}
                icon={() => null}
                style={{
                  backgroundColor: activeTab === 'passages' 
                    ? theme.colors.primary
                    : theme.colors.background,
                  borderColor: activeTab === 'passages' ? theme.colors.primary : theme.colors.onBackground,
                  borderWidth: 1.5,
                  borderRadius: 20
                }}
                textStyle={{
                  color: activeTab === 'passages' 
                    ? theme.colors.background
                    : theme.colors.onBackground,
                  fontFamily: 'Inter'
                }}
              >
                Passages
              </Chip>
              <Chip
                selected={activeTab === 'collections'}
                onPress={() => setActiveTab('collections')}
                icon={() => null}
                style={{
                  backgroundColor: activeTab === 'collections' 
                    ? theme.colors.primary
                    : theme.colors.background,
                  borderColor: activeTab === 'collections' ? theme.colors.primary : theme.colors.onBackground,
                  borderWidth: 1.5,
                  borderRadius: 20
                }}
                textStyle={{
                  color: activeTab === 'collections' 
                    ? theme.colors.background
                    : theme.colors.onBackground,
                  fontFamily: 'Inter'
                }}
              >
                Collections
              </Chip>
              <Chip
                selected={activeTab === 'people'}
                onPress={() => setActiveTab('people')}
                icon={() => null}
                style={{
                  backgroundColor: activeTab === 'people' 
                    ? theme.colors.primary
                    : theme.colors.background,
                  borderColor: activeTab === 'people' ? theme.colors.primary : theme.colors.onBackground,
                  borderWidth: 1.5,
                  borderRadius: 20
                }}
                textStyle={{
                  color: activeTab === 'people' 
                    ? theme.colors.background
                    : theme.colors.onBackground,
                  fontFamily: 'Inter'
                }}
              >
                People
              </Chip>
            </View>
          </View>
        )}

        {loading ? (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <SearchResultSkeleton />
            <SearchResultSkeleton />
            <SearchResultSkeleton />
          </View>
        ) : (
          hasSearched && (
            <View style={{ flex: 1 }}>
              {activeTab === 'passages' ? (
                <FlatList
                  data={passageResults}
                  keyExtractor={(item, index) => {
                    if ('readableReference' in item) {
                      return item.readableReference || index.toString();
                    }
                    return item.verse_reference || index.toString();
                  }}
                  renderItem={renderPassageResult}
                  ListEmptyComponent={
                    passageResults.length === 0 ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
                        <Text style={{ fontSize: 16, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
                          No passages found
                        </Text>
                      </View>
                    ) : null
                  }
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                />
              ) : activeTab === 'collections' ? (
                <FlatList
                  data={collectionResults}
                  keyExtractor={(item) => item.publishedId.toString()}
                  renderItem={renderCollectionResult}
                  ListEmptyComponent={
                    collectionResults.length === 0 ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
                        <Text style={{ fontSize: 16, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
                          No collections found
                        </Text>
                      </View>
                    ) : null
                  }
                  contentContainerStyle={{ paddingBottom: 40 }}
                />
              ) : (
                <FlatList
                  data={peopleResults.filter(u => u.username !== user.username)}
                  keyExtractor={(item) => item.username}
                  renderItem={renderPeopleResult}
                  ListEmptyComponent={
                    peopleResults.filter(u => u.username !== user.username).length === 0 ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
                        <Text style={{ fontSize: 16, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
                          No people found
                        </Text>
                      </View>
                    ) : null
                  }
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                />
              )}
            </View>
          )
        )}
      </View>

      <Modal
        visible={showCollectionPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCollectionPicker(false)}
      >
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0, 0, 0, 0.5)' 
        }}>
          <View style={{ 
            backgroundColor: theme.colors.surface, 
            borderRadius: 16, 
            padding: 20, 
            width: '85%',
            maxHeight: '70%'
          }}>
            <Text style={{ 
              fontSize: 20,
              fontWeight: '600',
              fontFamily: 'Inter',
              color: theme.colors.onBackground,
              marginBottom: 20
            }}>
              Choose a Collection
            </Text>
            
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
            <Text style={{ fontSize: 14, color: theme.colors.onBackground, marginBottom: 8, fontFamily: 'Inter', fontWeight: '600' }}>
              Or select existing collection
            </Text>
            <ScrollView>
              {(() => {
                // Filter to only show collections owned by the user
                const userOwnedCollections = collections.filter(col => {
                  const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
                  const owner = col.username ? normalize(col.username) : undefined;
                  const author = col.authorUsername ? normalize(col.authorUsername) : undefined;
                  const currentUser = normalize(user?.username);
                  
                  // Collection is owned by user if username matches OR authorUsername matches (and username is not set or also matches)
                  return (owner === currentUser) || (author === currentUser && (!owner || owner === currentUser));
                });
                const favorites = userOwnedCollections.filter(col => col.favorites || col.title === 'Favorites');
                const nonFavorites = userOwnedCollections.filter(col => !col.favorites && col.title !== 'Favorites');
                
                return (
                  <>
                    {favorites.map((collection) => (
                      <TouchableOpacity
                        key={collection.collectionId}
                        activeOpacity={0.1}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          marginBottom: 8,
                          backgroundColor: pickedCollection?.collectionId === collection.collectionId 
                            ? theme.colors.primary 
                            : 'transparent',
                          borderRadius: 8,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onPress={() => handleCollectionSelect(collection)}
                      >
                        <Text style={{
                          fontSize: 16,
                          color: pickedCollection?.collectionId === collection.collectionId 
                            ? '#fff' 
                            : theme.colors.onBackground,
                          fontFamily: 'Inter'
                        }}>
                          {collection.title}
                        </Text>
                        <Ionicons 
                          name="star" 
                          size={20} 
                          color={pickedCollection?.collectionId === collection.collectionId 
                            ? '#fff' 
                            : theme.colors.onBackground} 
                        />
                      </TouchableOpacity>
                    ))}
                    {nonFavorites.map((collection) => (
                      <TouchableOpacity
                        key={collection.collectionId}
                        activeOpacity={0.1}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          marginBottom: 8,
                          backgroundColor: pickedCollection?.collectionId === collection.collectionId 
                            ? theme.colors.primary 
                            : 'transparent',
                          borderRadius: 8
                        }}
                        onPress={() => handleCollectionSelect(collection)}
                      >
                        <Text style={{
                          fontSize: 16,
                          color: pickedCollection?.collectionId === collection.collectionId 
                            ? '#fff' 
                            : theme.colors.onBackground,
                          fontFamily: 'Inter'
                        }}>
                          {collection.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}
            </ScrollView>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 20
            }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8
                }}
                activeOpacity={0.1}
                onPress={() => {
                  setPickedCollection(undefined);
                  setNewCollectionTitle('');
                  setShowCollectionPicker(false);
                }}
              >
                <Text style={{
                  fontSize: 16,
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              {newCollectionTitle.trim() ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    opacity: (!newCollectionTitle.trim() || isCreatingNewCollection) ? 0.5 : 1
                  }}
                  activeOpacity={0.1}
                  onPress={handleCreateNewCollection}
                  disabled={!newCollectionTitle.trim() || isCreatingNewCollection}
                >
                  {isCreatingNewCollection ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{
                      fontSize: 16,
                      color: '#fff',
                      fontFamily: 'Inter',
                      fontWeight: '600'
                    }}>
                      Create
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    opacity: (!pickedCollection || isAddingToCollection) ? 0.5 : 1
                  }}
                  activeOpacity={0.1}
                  onPress={handleAddToCollection}
                  disabled={!pickedCollection || isAddingToCollection}
                >
                  {isAddingToCollection ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{
                      fontSize: 16,
                      color: '#fff',
                      fontFamily: 'Inter',
                      fontWeight: '600'
                    }}>
                      Add
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Text style={{ color: theme.colors.onSurface }}>
          {snackbarMessage}
        </Text>
      </Snackbar>

      <ShareVerseSheet
        visible={!!verseToShare || !!userVerseToShare}
        userVerses={
          userVerseToShare 
            ? [userVerseToShare]
            : verseToShare 
              ? [{
                  username: user.username,
                  readableReference: verseToShare.verse_reference,
                  verses: [verseToShare]
                }]
              : []
        }
        onClose={() => {
          setVerseToShare(null);
          setUserVerseToShare(null);
        }}
        onShareSuccess={(friend) => { 
          setVerseToShare(null);
          setUserVerseToShare(null);
          setSnackbarMessage(`Verse shared with ${friend}`);
          setSnackbarVisible(true);
        }}
        onShareError={() => { 
          setSnackbarMessage('Failed to share verse. Please save the verse to a collection first.');
          setSnackbarVisible(true);
        }}
      />
    </View>
  );
}
