import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Dimensions, ScrollView, StyleSheet, Text, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Divider, Portal, Surface, TextInput } from 'react-native-paper';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';

// Simple ID generator for React Native (doesn't require crypto polyfill)
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
import { addUserVersesToNewCollection, deleteUserVersesFromCollection, getUserCollections, getUserVersesPopulated, updateCollectionDB } from '../db';
import { useAppStore, UserVerse, Verse, CollectionNote } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

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

const { height } = Dimensions.get('window');

export default function EditCollection() {
    const styles = useStyles();
    const theme = useAppTheme();
    const [errorMessage, setErrorMessage] = useState('');
    const [title, setTitle] = useState('');
    const setCollections = useAppStore((state) => state.setCollections);
    const user = useAppStore((state) => state.user);
    const [creatingCollection, setCreatingCollection] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0.0);
    const [loadingVerses, setLoadingVerses] = useState(false);
    const [visibility, setVisibility] = useState('Private');
    const [reorderedUserVerses, setReorderedUserVerses] = useState<UserVerse[]>([]);
    const [notes, setNotes] = useState<CollectionNote[]>([]);
    const [noteText, setNoteText] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const updateCollectionStore = useAppStore((state) => state.updateCollection);
    const setEditingCollection = useAppStore((state) => state.setEditingCollection);
    
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
    const passageSnapPoints = useMemo(() => ['100%'], []);
    const noteSnapPoints = useMemo(() => ['100%'], []);
    const settingsSnapPoints = useMemo(() => ['40%'], []);
    const buildVerseOrderString = (verses: UserVerse[], notes: CollectionNote[]): string => {
      const verseRefs = verses
        .map((uv) => uv.readableReference?.trim())
        .filter((ref): ref is string => Boolean(ref && ref.length > 0));
      const noteIds = notes.map((n) => n.id);
      return [...verseRefs, ...noteIds].join(',');
    };


    // Get collection from store
    const editingCollection = useAppStore((state) => state.editingCollection);

    useEffect(() => {
      if (editingCollection) {
        setTitle(editingCollection.title);
        setVisibility(editingCollection.visibility || 'Private');
        
        // Check if userVerses are already populated
        if (editingCollection.userVerses && editingCollection.userVerses.every(uv => uv.verses?.length > 0)) {
          // Order by verseOrder if it exists
          const sorted = orderByVerseOrder(editingCollection.userVerses, editingCollection.verseOrder);
          setReorderedUserVerses(sorted);
        } else {
          // Fetch populated user verses
          const fetchPopulated = async () => {
            setLoadingVerses(true);
            try {
              const colToSend = { ...editingCollection, UserVerses: editingCollection.userVerses ?? [] };
              const data = await getUserVersesPopulated(colToSend);
              // Order by verseOrder before setting
              const sorted = orderByVerseOrder(data.userVerses ?? [], data.verseOrder);
              setReorderedUserVerses(sorted);
              setNotes(data.notes || []);
              // Update editingCollection with populated data (already sorted by server)
              setEditingCollection({ ...editingCollection, userVerses: sorted, notes: data.notes || [], verseOrder: data.verseOrder });
            } catch (err) {
              console.error(err);
              setReorderedUserVerses(editingCollection.userVerses || []);
              setNotes(editingCollection.notes || []);
            } finally {
              setLoadingVerses(false);
            }
          };
          
          fetchPopulated();
        }
        setNotes(editingCollection.notes || []);
      }
    }, [editingCollection]);

    // Update reorderedUserVerses when editingCollection changes (e.g., after reorder page)
    useEffect(() => {
      if (editingCollection?.userVerses) {
        // Sort by verseOrder if it exists
        const sorted = orderByVerseOrder(editingCollection.userVerses, editingCollection.verseOrder);
        setReorderedUserVerses(sorted);
        setNotes(editingCollection.notes || []);
        console.log('EditCollection: Updated reorderedUserVerses with verseOrder:', editingCollection.verseOrder);
      }
    }, [editingCollection?.userVerses, editingCollection?.verseOrder, editingCollection?.notes]);

    // Clean up editing state on unmount
    useEffect(() => {
      return () => {
        setEditingCollection(undefined);
      };
    }, [setEditingCollection]);

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

    const addPassage = () => {
      closeSheet();
    };

    const handleCreateCollection = async () => {
            if (reorderedUserVerses.length === 0) return;
            if (!editingCollection?.collectionId) return;
            
            setCreatingCollection(true);

            const updatedCollection = {
              ...editingCollection,
              title: title.trim() === '' ? editingCollection.title : title,
              visibility: visibility,
            };
            
            // Create verseOrder from reordered user verses and notes using readable references and note IDs
            updatedCollection.verseOrder = buildVerseOrderString(reorderedUserVerses, notes);
            updatedCollection.userVerses = reorderedUserVerses;
            updatedCollection.notes = notes;
            
            if (title.trim() === 'Favorites') {
              updatedCollection.title = 'Favorites-Other'
            }
            
            setProgressPercent(.50);
            
            // Update collection in database (includes verseOrder)
            await updateCollectionDB(updatedCollection);
            
            // Delete old user verses
            await deleteUserVersesFromCollection(editingCollection.collectionId);
            
            // Add updated user verses
            await addUserVersesToNewCollection(reorderedUserVerses, editingCollection.collectionId);
            
            // Update store
            updateCollectionStore(updatedCollection);
            
            // Fetch updated collections (they will now have userVerses with IDs)
            const collections = await getUserCollections(user.username);
            setCollections(collections);
            
            setProgressPercent(1);
            setCreatingCollection(false);
            setEditingCollection(undefined);
            router.replace("/");
    }
          
    const clickPlus = (verse: Verse) => {
      const userVerse: UserVerse = {
          username: user.username,
          readableReference: verse.verse_reference,
          verses: [verse],
      }
      if (reorderedUserVerses.find(r => r.readableReference === userVerse.readableReference)) {
          return;
      }
      console.log(userVerse.readableReference);
      console.log(userVerse.verses.at(0)?.verse_reference);
      addUserVerseToCollection(userVerse);
      
      closeSheet();
    }

      const handleDeleteUV = (userVerse: UserVerse) => {
        const updatedUserVerses = reorderedUserVerses.filter(
          (uv) => uv.readableReference !== userVerse.readableReference
        );
        const updatedVerseOrder = buildVerseOrderString(updatedUserVerses, notes);
        setReorderedUserVerses(updatedUserVerses);
        const current = useAppStore.getState().editingCollection;
        if (current) {
          setEditingCollection({
            ...current,
            userVerses: updatedUserVerses,
            notes: notes,
            verseOrder: updatedVerseOrder,
          });
        }
      }

      const addUserVerseToCollection = (userVerse: UserVerse) => {
        const updatedUserVerses = [...reorderedUserVerses, userVerse];
        const updatedVerseOrder = buildVerseOrderString(updatedUserVerses, notes);
        setReorderedUserVerses(updatedUserVerses);
        const current = useAppStore.getState().editingCollection;
        if (current) {
          setEditingCollection({
            ...current,
            userVerses: updatedUserVerses,
            notes: notes,
            verseOrder: updatedVerseOrder,
          });
        }
      }

      const handleAddNote = () => {
        if (!noteText.trim()) return;
        
        const newNote: CollectionNote = {
          id: editingNoteId || generateId(),
          collectionId: editingCollection?.collectionId || 0,
          text: noteText.trim(),
        };
        
        let updatedNotes: CollectionNote[];
        if (editingNoteId) {
          updatedNotes = notes.map(n => n.id === editingNoteId ? newNote : n);
        } else {
          updatedNotes = [...notes, newNote];
        }
        
        setNotes(updatedNotes);
        const updatedVerseOrder = buildVerseOrderString(reorderedUserVerses, updatedNotes);
        const current = useAppStore.getState().editingCollection;
        if (current) {
          setEditingCollection({
            ...current,
            notes: updatedNotes,
            verseOrder: updatedVerseOrder,
          });
        }
        setNoteText('');
        setEditingNoteId(null);
        noteSheetRef.current?.close();
      }

      const handleDeleteNote = (noteId: string) => {
        const updatedNotes = notes.filter(n => n.id !== noteId);
        setNotes(updatedNotes);
        const updatedVerseOrder = buildVerseOrderString(reorderedUserVerses, updatedNotes);
        const current = useAppStore.getState().editingCollection;
        if (current) {
          setEditingCollection({
            ...current,
            notes: updatedNotes,
            verseOrder: updatedVerseOrder,
          });
        }
      }

      const handleEditNote = (note: CollectionNote) => {
        setNoteText(note.text);
        setEditingNoteId(note.id);
        setIsNoteSheetOpen(true);
        noteSheetRef.current?.expand();
      }

    if (!editingCollection) {
      return (
        <View style={{...styles.container, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={styles.text}>Loading...</Text>
        </View>
      )
    }

    if (loadingVerses) {
      return (
        <View style={{...styles.container, alignItems: 'center', justifyContent: 'center', marginTop: -100}}>
          <ActivityIndicator size={70} animating={true} />
        </View>
      )
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
        {editingCollection?.title === 'Favorites' ? (
          <Surface style={{ ...styles.input, height: 70, justifyContent: 'center', paddingHorizontal: 12 }} elevation={1}>
            <Text style={{ ...styles.tinyText, marginBottom: 4, opacity: 0.7 }}>Collection Title</Text>
            <Text style={{ ...styles.text, color: theme.colors.onSurface, opacity: 0.5 }}>Favorites</Text>
          </Surface>
        ) : (
          <TextInput label="Collection Title" value={title} onChangeText={setTitle} style={styles.input} mode='outlined' />
        )}

        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15}}>
          <Text style={{...styles.tinyText, marginRight: 10}}>Visibility: {visibility === 'Public' ? 'Visible to Friends' : 'Not Visible to Friends'}</Text>
          <TouchableOpacity style={{...styles.button_outlined, width: 100, height: 30}} onPress={openSettingsSheet}>
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
          {(reorderedUserVerses.length > 0 || notes.length > 0) && (
            <TouchableOpacity 
              activeOpacity={0.1} 
              onPress={() => router.push('/collections/reorderExistingVerses')}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="reorder-three-outline" size={18} color={theme.colors.onBackground} />
              <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Reorder</Text>
            </TouchableOpacity>
          )}
        </View>

        { errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null }

        {/* User Verse Cards and Notes */}
        {(reorderedUserVerses.length > 0 || notes.length > 0) && (
          <>
            <View style={{marginTop: 20, width: '100%'}}>
              {(() => {
                // Combine verses and notes, order by verseOrder
                const orderArray = editingCollection?.verseOrder?.split(',').filter(ref => ref.trim() !== '') || [];
                const verseMap = new Map(reorderedUserVerses.map(uv => [uv.readableReference, uv]));
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
                      <Text style={styles.buttonText_filled}>Update Collection</Text>
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
              onChange={handlePassageSheetChange}
              backgroundStyle={{ backgroundColor: theme.colors.surface }}
              handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
              style={{ zIndex: 1000 }}
            >
            <BottomSheetScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            >
              <AddPassage onAddPassage={addPassage} onClickPlus={clickPlus} />
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
