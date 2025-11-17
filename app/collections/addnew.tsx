  import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, TextInput as RNTextInput, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Divider, Portal } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';
import { addUserVersesToNewCollection, createCollectionDB, getMostRecentCollectionId, getUserCollections, refreshUser, updateCollectionsOrder } from '../db';
import { Collection, CollectionNote, useAppStore, UserVerse, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { buildVerseOrderString } from '../utils/collectionUtils';

// Simple ID generator for React Native (doesn't require crypto polyfill)
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const { height } = Dimensions.get('window');

export default function Index() {
    const styles = useStyles();
    const theme = useAppTheme();
    const [errorMessage, setErrorMessage] = useState('');
    const newCollection = useAppStore((state) => state.newCollection);
    const [title, setTitle] = useState('');
    const addCollection = useAppStore((state) => state.addCollection);
    const setNewCollection = useAppStore((state) => state.setNewCollection);
    const resetNewCollection = useAppStore((state) => state.resetNewCollection);
    const user = useAppStore((state) => state.user);
    const collections = useAppStore((state) => state.collections);
    const setCollections = useAppStore((state) => state.setCollections);
    const [creatingCollection, setCreatingCollection] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0.0);
    const [loading, setLoading] = useState(false);
    const [visibility, setVisibility] = useState('Private');
    const [notes, setNotes] = useState<CollectionNote[]>([]);
    const [noteText, setNoteText] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const addUserVerseToCollection = useAppStore((state) => state.addUserVerseToCollection)
    const setUser = useAppStore((state) => state.setUser);
    
    // Track sheet open states
    const [isPassageSheetOpen, setIsPassageSheetOpen] = useState(false);
    const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
    const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
    
    // Animation for button fade-in
    const buttonOpacity = useSharedValue(1);
    
    // Bottom sheet refs
    const passageSheetRef = useRef<BottomSheet>(null);
    const noteSheetRef = useRef<BottomSheet>(null);
    const settingsSheetRef = useRef<BottomSheet>(null);
    
    // Snap points for bottom sheets
    const passageSnapPoints = useMemo(() => ['85%'], []);
    const noteSnapPoints = useMemo(() => ['60%'], []);
    const settingsSnapPoints = useMemo(() => ['40%'], []);


    const updateNewCollectionOrder = (userVerses: UserVerse[], notesToUpdate: CollectionNote[] = notes) => {
      const updatedVerseOrder = buildVerseOrderString(userVerses, notesToUpdate);
      setNewCollection({ ...newCollection, userVerses, notes: notesToUpdate, verseOrder: updatedVerseOrder });
    };

    // Initialize title and visibility if newCollection has data (e.g., from shared collection)
    useEffect(() => {
        if (newCollection) {
            if (newCollection.title && newCollection.title !== 'New Collection') {
                setTitle(newCollection.title);
            }
            if (newCollection.visibility) {
                setVisibility(newCollection.visibility);
            }
        }
    }, [newCollection]);

    const openSheet = () => {
      setIsPassageSheetOpen(true);
      passageSheetRef.current?.expand();
    };

    const openSettingsSheet = () => {
      setIsSettingsSheetOpen(true);
      settingsSheetRef.current?.snapToIndex(0);
    }

    const closeSheet = () => {
      passageSheetRef.current?.close();
    };

    const closeSettingsSheet = () => {
      settingsSheetRef.current?.close();
    }
    
    const handlePassageSheetChange = useCallback((index: number) => {
      setIsPassageSheetOpen(index !== -1);
      if (index === -1) {
        closeSheet();
      }
    }, []);
    
    const handleNoteSheetChange = useCallback((index: number) => {
      setIsNoteSheetOpen(index !== -1);
      if (index === -1) {
        setNoteText('');
        setEditingNoteId(null);
      }
    }, []);
    
    const handleSettingsSheetChange = useCallback((index: number) => {
      setIsSettingsSheetOpen(index !== -1);
      if (index === -1) {
        closeSettingsSheet();
      }
    }, []);

    // Animate button opacity when sheets close
    useEffect(() => {
      const shouldShow = !(isPassageSheetOpen || isNoteSheetOpen || isSettingsSheetOpen);
      if (shouldShow) {
        // Fade in when showing
        buttonOpacity.value = withTiming(1, { duration: 300 });
      } else {
        // Hide immediately when hiding
        buttonOpacity.value = 0;
      }
    }, [isPassageSheetOpen, isNoteSheetOpen, isSettingsSheetOpen]);

    const buttonAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: buttonOpacity.value,
      };
    });

      const handleCreateCollection = async () => {
            // Check collection limit based on paid status
            const maxCollections = user.isPaid ? 40 : 5;
            if (collections.length >= maxCollections) {
              if (!user.isPaid) {
                router.push('/pro');
                return;
              }
              setErrorMessage('You can create up to 40 collections.');
              return;
            }
            
            if (newCollection.userVerses.length > 30) {
              setErrorMessage('Collections can contain up to 30 passages.');
              return;
            }

            setCreatingCollection(true);
            setErrorMessage('');

            // Respect the draft order from newCollection.verseOrder
            // Order userVerses and notes according to verseOrder
            const orderArray = (newCollection.verseOrder || '').split(',').filter(ref => ref.trim() !== '').map(ref => ref.trim());
            const verseMap = new Map<string, UserVerse>();
            const noteMap = new Map<string, CollectionNote>();
            
            newCollection.userVerses.forEach(uv => {
              if (uv.readableReference) {
                const key = uv.readableReference.trim().toLowerCase();
                verseMap.set(key, uv);
              }
            });
            
            notes.forEach(note => {
              noteMap.set(note.id, note);
            });
            
            const orderedUserVerses: UserVerse[] = [];
            const orderedNotes: CollectionNote[] = [];
            
            // Add items in the order specified by verseOrder
            orderArray.forEach(ref => {
              const verseKey = ref.toLowerCase();
              if (verseMap.has(verseKey)) {
                orderedUserVerses.push(verseMap.get(verseKey)!);
                verseMap.delete(verseKey);
              } else if (noteMap.has(ref)) {
                orderedNotes.push(noteMap.get(ref)!);
                noteMap.delete(ref);
              }
            });
            
            // Add any remaining items not in the order
            verseMap.forEach(verse => orderedUserVerses.push(verse));
            noteMap.forEach(note => orderedNotes.push(note));
            
            // Use the ordered arrays and existing verseOrder (which already has the correct order)
            const preparedCollection: Collection = {
              ...newCollection,
              authorUsername: newCollection.authorUsername ?? user.username,
              username: user.username,
              visibility: visibility,
              verseOrder: newCollection.verseOrder || buildVerseOrderString(orderedUserVerses, orderedNotes),
              notes: orderedNotes,
              userVerses: orderedUserVerses,
              title: (() => {
                if (title.trim() === '') return 'New Collection';
                if (title.trim() === 'Favorites') return 'Favorites-Other';
                return title;
              })(),
            };

            try {
              await createCollectionDB(preparedCollection, user.username);
              const id = await getMostRecentCollectionId(user.username);
              await addUserVersesToNewCollection(orderedUserVerses, id);
              const collections = await getUserCollections(user.username);
              setCollections(collections);

              const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
              const newOrder = currentOrder ? `${currentOrder},${id}` : id.toString();
              const updatedUser = { ...user, collectionsOrder: newOrder };
              setUser(updatedUser);

              await updateCollectionsOrder(newOrder, user.username);

              const refreshedUser = await refreshUser(user.username);
              setUser(refreshedUser);

              resetNewCollection();
              setTitle('');
              setProgressPercent(1);
              setCreatingCollection(false);
              router.replace("/");
            } catch (error) {
              console.error('Failed to create collection', error);
              const message = error instanceof Error ? error.message : 'Failed to create collection';
              setErrorMessage(message);
              setCreatingCollection(false);
            }
      }
          
      const clickPlus = (verse: Verse) => {
        // Check verse limit per collection for free users
        if (!user.isPaid) {
          const maxVersesPerCollection = 10;
          if (newCollection.userVerses.length >= maxVersesPerCollection) {
            router.push('/pro');
            return;
          }
        }
        
        const userVerse: UserVerse = {
            username: user.username,
            readableReference: verse.verse_reference,
            verses: [verse],
        }
        if (newCollection.userVerses.find(r => r.readableReference === userVerse.readableReference)) {
            return;
        }
        addUserVerseToCollection(userVerse);
        updateNewCollectionOrder([...newCollection.userVerses, userVerse], notes);
        
        closeSheet();
      }

      const handleDeleteUV = (userVerse: UserVerse) => {
        const updatedUserVerses = newCollection.userVerses.filter(
          (uv) => uv.readableReference !== userVerse.readableReference
        );
        updateNewCollectionOrder(updatedUserVerses, notes);
      }

      const handleAddNote = () => {
        if (!noteText.trim()) return;
        
        const newNote: CollectionNote = {
          id: editingNoteId || generateId(),
          collectionId: 0, // Will be set when collection is created
          text: noteText.trim(),
        };
        
        let updatedNotes: CollectionNote[];
        if (editingNoteId) {
          updatedNotes = notes.map(n => n.id === editingNoteId ? newNote : n);
        } else {
          updatedNotes = [...notes, newNote];
        }
        
        setNotes(updatedNotes);
        updateNewCollectionOrder(newCollection.userVerses, updatedNotes);
        setNoteText('');
        setEditingNoteId(null);
        noteSheetRef.current?.close();
      }

      const handleDeleteNote = (noteId: string) => {
        const updatedNotes = notes.filter(n => n.id !== noteId);
        setNotes(updatedNotes);
        updateNewCollectionOrder(newCollection.userVerses, updatedNotes);
      }

      const handleEditNote = (note: CollectionNote) => {
        setNoteText(note.text);
        setEditingNoteId(note.id);
        setIsNoteSheetOpen(true);
        noteSheetRef.current?.expand();
      }

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
        <RNTextInput value={title} placeholder='Collection Title' placeholderTextColor={theme.colors.onBackground} onChangeText={setTitle} style={{...styles.input, ...styles.tinyText, borderColor: theme.colors.onBackground, borderWidth: 1, height: 50, backgroundColor: theme.colors.surface}} />

        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15}}>
          <Text style={{...styles.tinyText, marginRight: 10}}>Visibility: {visibility === 'Public' ? 'Visible to Friends' : 'Not Visible to Friends'}</Text>

          <TouchableOpacity style={{...styles.button_outlined, width: 100, height: 30}} activeOpacity={0.8} onPress={openSettingsSheet}>
            <Text style={{...styles.buttonText_outlined, fontSize: 14}}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={{flexDirection: 'row', gap: 16, width: '100%', marginBottom: 20, flexWrap: 'wrap'}}>
          <TouchableOpacity activeOpacity={0.1} onPress={openSheet} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.onBackground} />
            <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Add Passage</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            activeOpacity={0.1} 
            onPress={() => router.push('/collections/verseCatalog')}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="library-outline" size={18} color={theme.colors.onBackground} />
            <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Verse Catalog</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            activeOpacity={0.1} 
            onPress={() => {
              setNoteText('');
              setEditingNoteId(null);
              setIsNoteSheetOpen(true);
              noteSheetRef.current?.expand();
            }}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="document-text-outline" size={18} color={theme.colors.onBackground} />
            <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Add Note</Text>
          </TouchableOpacity>
          {(newCollection?.userVerses.length > 0 || notes.length > 0) && (
            <TouchableOpacity 
              activeOpacity={0.1} 
              onPress={() => router.push('/collections/reorderVerses')}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="reorder-three-outline" size={18} color={theme.colors.onBackground} />
              <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Reorder</Text>
            </TouchableOpacity>
          )}
        </View>

        { errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null }

        {/* User Verse Cards and Notes */}
        {(newCollection?.userVerses.length > 0 || notes.length > 0) && (
          <>
            <View style={{marginTop: 20, width: '100%'}}>
              {(() => {
                // Combine verses and notes, order by verseOrder
                const orderArray = newCollection?.verseOrder?.split(',').filter(o => o.trim()) || [];
                const verseMap = new Map(newCollection.userVerses.map((uv: UserVerse) => [uv.readableReference, uv]));
                const noteMap = new Map(notes.map(n => [n.id, n]));
                const ordered: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
                const unordered: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
                
                orderArray.forEach(ref => {
                  const trimmedRef = ref.trim();
                  if (verseMap.has(trimmedRef)) {
                    ordered.push({type: 'verse', data: verseMap.get(trimmedRef)!});
                    verseMap.delete(trimmedRef);
                  } else if (noteMap.has(trimmedRef)) {
                    ordered.push({type: 'note', data: noteMap.get(trimmedRef)!});
                    noteMap.delete(trimmedRef);
                  }
                });
                
                verseMap.forEach(verse => unordered.push({type: 'verse', data: verse}));
                noteMap.forEach(note => unordered.push({type: 'note', data: note}));
                
                const allItems = [...ordered, ...unordered];
                
                return allItems.map((item, i) => {
                  if (item.type === 'verse') {
                    const userVerse = item.data;
                    return (
                  <View key={userVerse.readableReference} style={{width: '100%', marginBottom: 20}}>
                    <View style={{width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface}}>
                      <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                        <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{userVerse.readableReference}</Text>
                        <TouchableOpacity onPress={() => {handleDeleteUV(userVerse)}}>
                          <Ionicons name={"trash-bin"} size={20} color={theme.colors.onBackground} />
                        </TouchableOpacity>
                      </View>
                      {userVerse.verses.map((verse) => (
                        <View key={verse.verse_reference}>
                          <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{verse.verse_Number ? verse.verse_Number + ": " : ''}{verse.text}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                    );
                  } else {
                    const note = item.data;
                    return (
                      <View key={note.id} style={{width: '100%', marginBottom: 20}}>
                        <View style={{width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface}}>
                          <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                            <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 16, fontStyle: 'italic'}}>{note.text}</Text>
                            <View style={{flexDirection: 'row', gap: 10}}>
                              <TouchableOpacity onPress={() => handleEditNote(note)}>
                                <Ionicons name={"pencil"} size={20} color={theme.colors.onBackground} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                                <Ionicons name={"trash-bin"} size={20} color={theme.colors.onBackground} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  }
                });
              })()}
            </View>
          </>
        )}

        <View style={{height: 120}}></View>
      </ScrollView>

          <Animated.View style={[buttonAnimatedStyle, { position: 'absolute', bottom: 60, width: '100%', zIndex: 10, alignItems: 'center' }]}>
            <View style={{...styles.button_filled, width: '90%', alignSelf: 'center', backgroundColor: theme.colors.onPrimary,
            boxShadow: '0px 0px 23px 10px rgba(0,0,0,.2)'
            }}></View>

            <TouchableOpacity style={{...styles.button_filled, position: 'absolute', zIndex: 10, marginHorizontal: 20, width: '90%', alignSelf: 'center'
            }} activeOpacity={0.1} onPress={handleCreateCollection}>
          {creatingCollection ? (
                      <Text style={styles.buttonText_filled}>
                          <ActivityIndicator animating={true} color={theme.colors.background} />
                      </Text> 
                  ) : (
                      <Text style={styles.buttonText_filled}>Create Collection</Text>
                  )}
            </TouchableOpacity>
          </Animated.View>

          {/* Add Passage Bottom Sheet */}
          <Portal>
            <BottomSheet
              ref={passageSheetRef}
              index={-1}
              snapPoints={passageSnapPoints}
              enablePanDownToClose
              enableOverDrag={false}
              android_keyboardInputMode="adjustResize"
              keyboardBehavior="interactive"
              keyboardBlurBehavior="restore"
              onChange={handlePassageSheetChange}
              backgroundStyle={{ backgroundColor: theme.colors.surface }}
              handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
              style={{ zIndex: 1000 }}
            >
            <BottomSheetScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <AddPassage onAddPassage={closeSheet} onClickPlus={clickPlus} />
            </BottomSheetScrollView>
          </BottomSheet>
          </Portal>

          {/* Add Note Bottom Sheet */}
          <Portal>
            <BottomSheet
              ref={noteSheetRef}
              index={-1}
              snapPoints={noteSnapPoints}
              enablePanDownToClose
              enableOverDrag={false}
              android_keyboardInputMode="adjustResize"
              keyboardBehavior="interactive"
              keyboardBlurBehavior="restore"
              onChange={handleNoteSheetChange}
              backgroundStyle={{ backgroundColor: theme.colors.surface }}
              handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
              style={{ zIndex: 1000 }}
            >
            <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40 }}>
              <Text style={{
                fontFamily: 'Noto Serif bold',
                fontSize: 20,
                color: theme.colors.onBackground,
                marginBottom: 20,
                marginTop: 10,
              }}>
                {editingNoteId ? 'Edit Note' : 'Add Note'}
              </Text>
              <RNTextInput
                style={{
                  backgroundColor: theme.colors.background,
                  borderRadius: 8,
                  padding: 12,
                  color: theme.colors.onBackground,
                  fontSize: 16,
                  minHeight: 120,
                  textAlignVertical: 'top',
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: theme.colors.onSurfaceVariant,
                }}
                placeholder="Enter your note..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                multiline
                numberOfLines={6}
                value={noteText}
                onChangeText={setNoteText}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={handleAddNote}
                disabled={!noteText.trim()}
              >
                <Text style={{
                  color: theme.colors.onPrimary,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  {editingNoteId ? 'Update Note' : 'Add Note'}
                </Text>
              </TouchableOpacity>
            </BottomSheetView>
          </BottomSheet>
          </Portal>

          {/* Settings Bottom Sheet */}
          <Portal>
            <BottomSheet
              ref={settingsSheetRef}
              index={-1}
              snapPoints={settingsSnapPoints}
              enablePanDownToClose
              enableOverDrag={false}
              android_keyboardInputMode="adjustResize"
              keyboardBehavior="interactive"
              keyboardBlurBehavior="restore"
              onChange={handleSettingsSheetChange}
              backgroundStyle={{ backgroundColor: theme.colors.surface }}
              handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
              style={{ zIndex: 1000 }}
            >
            <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40 }}>
              <Text style={{
                fontFamily: 'Noto Serif bold',
                fontSize: 20,
                color: theme.colors.onBackground,
                marginBottom: 20,
                marginTop: 10,
              }}>
                Visibility Settings
              </Text>
              <Divider />
              <TouchableOpacity
                style={{ paddingVertical: 16 }}
                onPress={() => {
                  setVisibility('Private');
                  closeSettingsSheet();
                }}
              >
                <Text style={{ ...styles.tinyText, fontSize: 16 }}>Not Visible to Friends</Text>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                style={{ paddingVertical: 16 }}
                onPress={() => {
                  setVisibility('Public');
                  closeSettingsSheet();
                }}
              >
                <Text style={{ ...styles.tinyText, fontSize: 16 }}>Visible to Friends</Text>
              </TouchableOpacity>
              <Divider />
            </BottomSheetView>
          </BottomSheet>
          </Portal>

          </View>
    )
  }
