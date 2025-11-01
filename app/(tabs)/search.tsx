import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Chip, Searchbar, Snackbar } from 'react-native-paper';
import { SearchResultSkeleton } from '../components/skeleton';
import { addUserVersesToNewCollection, checkRelationship, getVerseSearchResult, searchUsers, sendFriendRequest, trackSearch, updateCollectionDB } from '../db';
import ShareVerseSheet from '../components/shareVerseSheet';
import { Collection, useAppStore, User, UserVerse, Verse } from '../store';
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
  const popularSearches = useAppStore((state) => state.popularSearches);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('passages');
  const [loading, setLoading] = useState(false);
  const [passageResults, setPassageResults] = useState<Verse[]>([]);
  const [peopleResults, setPeopleResults] = useState<User[]>([]);
  const [relationships, setRelationships] = useState<Map<string, number>>(new Map());
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [pickedCollection, setPickedCollection] = useState<Collection | undefined>(undefined);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [verseToShare, setVerseToShare] = useState<Verse | null>(null);

  useEffect(() => {
    loadRecentSearches();
  }, []);

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
    
    setLoading(true);
    try {
      const [passageSearchResult, peopleSearchResults] = await Promise.all([
        getVerseSearchResult(searchTerm).catch(() => ({ verses: [] })),
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
      
      if (passageSearchResult.verses.length === 1) {
        const verseReference = passageSearchResult.verses[0]?.verse_reference || "";
        const isError = errorMessages.some(msg => verseReference.includes(msg));
        if (isError) {
          setPassageResults([]);
        } else {
          setPassageResults(passageSearchResult.verses);
        }
      } else {
        setPassageResults(passageSearchResult.verses);
      }
      
      setPeopleResults(peopleSearchResults);
      
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
    setPickedCollection(undefined);
    setShowCollectionPicker(true);
  };

  const handleAddToCollection = async () => {
    if (!pickedCollection || !selectedVerse || !user.username || isAddingToCollection) return;
    
    const parsed = parseVerseReference(selectedVerse.verse_reference);
    if (!parsed) return;

    const alreadyExists = pickedCollection.userVerses.some(
      uv => uv.readableReference === selectedVerse.verse_reference
    );

    if (alreadyExists) {
      setSnackbarMessage('This passage is already in the collection');
      setSnackbarVisible(true);
      setShowCollectionPicker(false);
      setSelectedVerse(null);
      setPickedCollection(undefined);
      return;
    }

    setIsAddingToCollection(true);

    const userVerse: UserVerse = {
      username: user.username,
      readableReference: selectedVerse.verse_reference,
      verses: [selectedVerse]
    };

    try {
      await addUserVersesToNewCollection([userVerse], pickedCollection.collectionId!);
      
      const currentOrder = pickedCollection.verseOrder || '';
      const newOrder = currentOrder ? `${currentOrder}${selectedVerse.verse_reference},` : `${selectedVerse.verse_reference},`;
      
      const updatedCollection = {
        ...pickedCollection,
        userVerses: [...pickedCollection.userVerses, userVerse],
        verseOrder: newOrder,
      };
      
      await updateCollectionDB(updatedCollection);
      setCollections(collections.map(c => 
        c.collectionId === pickedCollection.collectionId ? updatedCollection : c
      ));

      setShowCollectionPicker(false);
      setSelectedVerse(null);
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

  const renderPassageResult = ({ item }: { item: Verse }) => (
    <View style={{
      backgroundColor: theme.colors.surface,
      padding: 16,
      marginBottom: 12,
      borderRadius: 12
    }}>
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.onBackground,
        marginBottom: 8,
        fontFamily: 'Inter'
      }}>
        {item.verse_reference}
      </Text>
      <Text style={{
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
        fontFamily: 'Inter',
        lineHeight: 20
      }}>
        {item.text}
      </Text>
      
      <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="people-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
            {item.users_Saved_Verse || 0} saved
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
            {item.users_Memorized || 0} memorized
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
        <TouchableOpacity 
          onPress={() => handleSaveVerse(item)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="bookmark-outline" size={18} color={theme.colors.onBackground} />
          <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleReadVerse(item)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="library-outline" size={18} color={theme.colors.onBackground} />
          <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Read</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setVerseToShare(item)}>
          <Ionicons name="share-social-outline" size={18} color={theme.colors.onBackground} />
          <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Share</Text>
        </TouchableOpacity>
      </View>
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
        backgroundColor: theme.colors.surface,
        padding: 16,
        marginBottom: 12,
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
          marginRight: 12
        }}>
          <Ionicons name="person" size={24} color={theme.colors.onBackground} />
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
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            opacity: (relationshipStatus === 1 || relationshipStatus === 0) ? 0.5 : 1,
            ...buttonStyle
          }}
        >
          <Text style={{
            color: textColor,
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
      <View style={{ flex: 1, marginTop: 40 }}>
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
              Search for passages, collections, or people
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
                    fontSize: 18,
                    fontWeight: '600',
                    color: theme.colors.onBackground,
                    marginBottom: 12,
                    fontFamily: 'Inter'
                  }}>
                    Recent searches
                  </Text>
                  {recentSearches.map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSearchQuery(search);
                        handleSearch(search);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        borderBottomWidth: index < recentSearches.length - 1 ? 1 : 0,
                        borderBottomColor: theme.colors.surface
                      }}
                    >
                      <Text style={{
                        fontSize: 16,
                        color: theme.colors.onBackground,
                        fontFamily: 'Inter'
                      }}>
                        {search}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {popularSearches.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: theme.colors.onBackground,
                    marginBottom: 12,
                    fontFamily: 'Inter'
                  }}>
                    Popular searches
                  </Text>
                  {popularSearches.map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSearchQuery(search);
                        handleSearch(search);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        borderBottomWidth: index < popularSearches.length - 1 ? 1 : 0,
                        borderBottomColor: theme.colors.surface
                      }}
                    >
                      <Text style={{
                        fontSize: 16,
                        color: theme.colors.onBackground,
                        fontFamily: 'Inter'
                      }}>
                        {search}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
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
                    ? '#fff'
                    : 'rgba(255, 255, 255, 0.1)',
                  borderColor: '#fff',
                  borderWidth: 1,
                  borderRadius: 20
                }}
                textStyle={{
                  color: activeTab === 'passages' 
                    ? theme.colors.background
                    : '#fff',
                  fontFamily: 'Inter'
                }}
              >
                Passages
              </Chip>
              <Chip
                selected={activeTab === 'collections'}
                onPress={() => setActiveTab('collections')}
                disabled={true}
                icon={() => null}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: '#fff',
                  borderWidth: 1,
                  opacity: 0.5,
                  borderRadius: 20
                }}
                textStyle={{
                  color: '#fff',
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
                    ? '#fff'
                    : 'rgba(255, 255, 255, 0.1)',
                  borderColor: '#fff',
                  borderWidth: 1,
                  borderRadius: 20
                }}
                textStyle={{
                  color: activeTab === 'people' 
                    ? theme.colors.background
                    : '#fff',
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
                  keyExtractor={(item, index) => item.verse_reference || index.toString()}
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
            
            <ScrollView>
              {(() => {
                const favorites = collections.filter(col => col.favorites || col.title === 'Favorites');
                const nonFavorites = collections.filter(col => !col.favorites && col.title !== 'Favorites');
                
                return (
                  <>
                    {favorites.map((collection) => (
                      <TouchableOpacity
                        key={collection.collectionId}
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
                        onPress={() => setPickedCollection(collection)}
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
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          marginBottom: 8,
                          backgroundColor: pickedCollection?.collectionId === collection.collectionId 
                            ? theme.colors.primary 
                            : 'transparent',
                          borderRadius: 8
                        }}
                        onPress={() => setPickedCollection(collection)}
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
                onPress={() => {
                  setPickedCollection(undefined);
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

              <TouchableOpacity
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  opacity: (!pickedCollection || isAddingToCollection) ? 0.5 : 1
                }}
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
        visible={!!verseToShare}
        verseReference={verseToShare?.verse_reference || null}
        onClose={() => setVerseToShare(null)}
        onShareSuccess={(friend) => { setVerseToShare(null); setSnackbarMessage(`Verse shared with ${friend}`); setSnackbarVisible(true); }}
        onShareError={() => { setSnackbarMessage('Failed to share verse'); setSnackbarVisible(true); }}
      />
    </View>
  );
}
