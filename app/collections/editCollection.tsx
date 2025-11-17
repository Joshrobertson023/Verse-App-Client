import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
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
import { addUserVersesToNewCollection, deleteUserVersesFromCollection, getUserCollections, getUserVersesPopulated, populateVersesForUserVerses, updateCollectionDB } from '../db';
import { useAppStore, UserVerse, Verse, CollectionNote } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { buildVerseOrderString } from '../utils/collectionUtils';

// Order verses by verseOrder
function orderByVerseOrder(userVerses: UserVerse[], verseOrder?: string): UserVerse[] {
  if (!verseOrder || !verseOrder.trim()) return userVerses;
  
  const orderArray = verseOrder.split(',').filter(ref => ref.trim() !== '').map(ref => ref.trim());
  const ordered: UserVerse[] = [];
  const unordered: UserVerse[] = [];
  
  // Create a map for quick lookup (case-insensitive)
  const verseMap = new Map<string, UserVerse>();
  userVerses.forEach(uv => {
    if (uv.readableReference) {
      const key = uv.readableReference.trim().toLowerCase();
      if (!verseMap.has(key)) {
        verseMap.set(key, uv);
      }
    }
  });
  
  // First, add verses in the order specified
  orderArray.forEach(ref => {
    const key = ref.toLowerCase();
    const verse = verseMap.get(key);
    if (verse) {
      ordered.push(verse);
      verseMap.delete(key);
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
    const passageSnapPoints = useMemo(() => ['85%'], []);
    const noteSnapPoints = useMemo(() => ['60%'], []);
    const settingsSnapPoints = useMemo(() => ['40%'], []);


    // Get collection from store
    const editingCollection = useAppStore((state) => state.editingCollection);
    const hasLoadedVerses = useRef(false);
    const collectionIdRef = useRef<number | undefined>(undefined);

    useEffect(() => {
      if (!editingCollection) {
        hasLoadedVerses.current = false;
        collectionIdRef.current = undefined;
        return;
      }

      // Reset if collection ID changed
      if (collectionIdRef.current !== editingCollection.collectionId) {
        hasLoadedVerses.current = false;
        collectionIdRef.current = editingCollection.collectionId;
      }

      setTitle(editingCollection.title);
      setVisibility(editingCollection.visibility || 'Private');
      
      // Only load verses once per collection
      if (!hasLoadedVerses.current) {
        // Check if userVerses are already populated
        if (editingCollection.userVerses && editingCollection.userVerses.length > 0 && editingCollection.userVerses.every(uv => uv.verses && uv.verses.length > 0)) {
          // Order by verseOrder if it exists
          const sorted = orderByVerseOrder(editingCollection.userVerses, editingCollection.verseOrder);
          setReorderedUserVerses(sorted);
          setNotes(editingCollection.notes || []);
          hasLoadedVerses.current = true;
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
              // Update editingCollection with populated data - this is safe because hasLoadedVerses prevents re-triggering
              setEditingCollection({ ...editingCollection, userVerses: sorted, notes: data.notes || [], verseOrder: data.verseOrder });
              hasLoadedVerses.current = true;
            } catch (err) {
              console.error(err);
              setReorderedUserVerses(editingCollection.userVerses || []);
              setNotes(editingCollection.notes || []);
              hasLoadedVerses.current = true;
            } finally {
              setLoadingVerses(false);
            }
          };
          
          fetchPopulated();
        }
      } else {
        // Collection already loaded, just update local state if needed
        if (editingCollection.userVerses && editingCollection.userVerses.length > 0) {
          const sorted = orderByVerseOrder(editingCollection.userVerses, editingCollection.verseOrder);
          setReorderedUserVerses(sorted);
        }
        if (editingCollection.notes) {
          setNotes(editingCollection.notes);
        }
      }
    }, [editingCollection?.collectionId, setEditingCollection]);

    // Reload collection data when returning from reorder page (similar to collection view page)
    const reorderedUserVersesRef = useRef<UserVerse[]>([]);
    useEffect(() => {
      reorderedUserVersesRef.current = reorderedUserVerses;
    }, [reorderedUserVerses]);
    
    useFocusEffect(
      useCallback(() => {
        if (!editingCollection || !hasLoadedVerses.current) return;
        
        // When returning from reorder page, preserve verse text from current state
        // and merge with new order from editingCollection
        if (editingCollection.userVerses && editingCollection.userVerses.length > 0) {
          // Create a map of current verses with text preserved (use ref to avoid dependency issues)
          const currentVerseMap = new Map<string, UserVerse>();
          reorderedUserVersesRef.current.forEach(uv => {
            if (uv.readableReference) {
              const key = uv.readableReference.trim().toLowerCase();
              currentVerseMap.set(key, uv);
            }
          });
          
          // Get new verses from editingCollection and preserve text from current state
          const newVerses = editingCollection.userVerses.map(uv => {
            const key = uv.readableReference?.trim().toLowerCase();
            const existingVerse = key ? currentVerseMap.get(key) : null;
            // Preserve verse text from current state if available
            return existingVerse && existingVerse.verses && existingVerse.verses.length > 0
              ? existingVerse
              : uv;
          });
          
          const sorted = orderByVerseOrder(newVerses, editingCollection.verseOrder);
          setReorderedUserVerses(sorted);
        }
        if (editingCollection.notes) {
          setNotes(editingCollection.notes);
        }
      }, [editingCollection?.verseOrder, editingCollection?.userVerses, editingCollection?.notes])
    );

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
            
            // Preserve the current verseOrder to maintain the mixed order of verses and notes
            // Only rebuild if items were added/removed (filter out deleted items, append new ones)
            let newVerseOrder = editingCollection.verseOrder || '';
            
            if (newVerseOrder && newVerseOrder.trim()) {
              // Filter out items that no longer exist and add new items
              const orderArray = newVerseOrder.split(',').filter(ref => ref.trim() !== '');
              const verseRefs = new Set(reorderedUserVerses.map(uv => uv.readableReference?.trim().toLowerCase()).filter(Boolean));
              const noteIdSet = new Set(notes.map(n => n.id).filter(Boolean));
              
              // Keep existing items that still exist
              const validOrder: string[] = [];
              orderArray.forEach(ref => {
                const trimmedRef = ref.trim();
                const lowerRef = trimmedRef.toLowerCase();
                if (verseRefs.has(lowerRef) || noteIdSet.has(trimmedRef)) {
                  validOrder.push(trimmedRef);
                }
              });
              
              // Add any new items not in the order
              reorderedUserVerses.forEach(uv => {
                const ref = uv.readableReference?.trim();
                if (ref && !validOrder.some(r => r.toLowerCase() === ref.toLowerCase())) {
                  validOrder.push(ref);
                }
              });
              notes.forEach(note => {
                if (note.id && !validOrder.includes(note.id)) {
                  validOrder.push(note.id);
                }
              });
              
              newVerseOrder = validOrder.join(',');
            } else {
              // No existing order, build from arrays (verses first, then notes)
              newVerseOrder = buildVerseOrderString(reorderedUserVerses, notes);
            }
            
            updatedCollection.verseOrder = newVerseOrder;
            updatedCollection.userVerses = reorderedUserVerses;
            updatedCollection.notes = notes;
            
            if (title.trim() === 'Favorites') {
              updatedCollection.title = 'Favorites-Other'
            }
            
            // Update editingCollection in store immediately with new verseOrder
            setEditingCollection({ ...updatedCollection, verseOrder: newVerseOrder });
            
            setProgressPercent(.50);
            
            // Update collection in database (includes verseOrder)
            await updateCollectionDB(updatedCollection);
            
            // Delete old user verses
            await deleteUserVersesFromCollection(editingCollection.collectionId);
            
            // Add updated user verses (in the correct order)
            await addUserVersesToNewCollection(reorderedUserVerses, editingCollection.collectionId);
            
            // Update store
            updateCollectionStore(updatedCollection);
            
            // Fetch updated collections (they will now have userVerses with IDs)
            const collections = await getUserCollections(user.username);
            setCollections(collections);
            
            // Find the updated collection and update editingCollection with server data
            const updatedCol = collections.find(c => c.collectionId === editingCollection.collectionId);
            if (updatedCol) {
              // Populate verse text for userVerses
              let populatedUserVerses = updatedCol.userVerses || [];
              try {
                populatedUserVerses = await populateVersesForUserVerses(populatedUserVerses);
              } catch (populateError) {
                console.warn('Failed to populate verses after saving:', populateError);
              }
              
              // Ensure userVerses are ordered by verseOrder
              const orderedUserVerses = orderByVerseOrder(populatedUserVerses, newVerseOrder);
              const finalCollection = { ...updatedCol, verseOrder: newVerseOrder, userVerses: orderedUserVerses };
              
              // Update the collection in the collections array with populated verses
              const updatedCollectionsWithVerses = collections.map(c => 
                c.collectionId === editingCollection.collectionId ? finalCollection : c
              );
              setCollections(updatedCollectionsWithVerses);
              
              setEditingCollection(finalCollection);
            }
            
            setProgressPercent(1);
            setCreatingCollection(false);
            setEditingCollection(undefined);
            router.replace("/");
    }
          
    const clickPlus = (verse: Verse) => {
      try {
        if (!verse || !verse.verse_reference) {
          console.warn('Invalid verse passed to clickPlus');
          return;
        }
        
        if (!user?.username) {
          console.warn('No user found when adding verse');
          return;
        }
        
        const userVerse: UserVerse = {
            username: user.username,
            readableReference: verse.verse_reference,
            verses: [verse],
        }
        
        // Check if verse already exists (case-insensitive)
        const refToCheck = userVerse.readableReference?.trim().toLowerCase();
        const alreadyExists = reorderedUserVerses.some(r => 
          r.readableReference?.trim().toLowerCase() === refToCheck
        );
        
        if (alreadyExists) {
          console.log('Verse already exists in collection:', userVerse.readableReference);
          return;
        }
        
        console.log('Adding verse to collection:', userVerse.readableReference);
        addUserVerseToCollection(userVerse);
        closeSheet();
      } catch (error) {
        console.error('Error in clickPlus:', error);
      }
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
        try {
          // Check verse limit per collection for free users
          if (!user.isPaid) {
            const maxVersesPerCollection = 10;
            if (reorderedUserVerses.length >= maxVersesPerCollection) {
              router.push('/pro');
              return;
            }
          }
          
          const updatedUserVerses = [...reorderedUserVerses, userVerse];
          
          // Preserve existing order and append new passage reference
          const current = useAppStore.getState().editingCollection;
          if (!current) {
            console.warn('No editingCollection found when adding verse');
            return;
          }
          
          let updatedVerseOrder: string;
          
          if (current?.verseOrder && current.verseOrder.trim()) {
            // Append new passage reference to existing order
            const newRef = userVerse.readableReference?.trim();
            if (newRef) {
              // Check if reference already exists in order to avoid duplicates
              const orderArray = current.verseOrder.split(',').filter(ref => ref.trim() !== '');
              const refExists = orderArray.some(ref => ref.trim().toLowerCase() === newRef.toLowerCase());
              if (!refExists) {
                updatedVerseOrder = `${current.verseOrder}${newRef},`;
              } else {
                updatedVerseOrder = current.verseOrder;
              }
            } else {
              updatedVerseOrder = current.verseOrder;
            }
          } else {
            // No existing order, build from arrays
            updatedVerseOrder = buildVerseOrderString(updatedUserVerses, notes);
          }
          
          console.log('Updating reorderedUserVerses with new verse:', userVerse.readableReference);
          console.log('Current reorderedUserVerses length:', reorderedUserVerses.length);
          console.log('Updated userVerses length:', updatedUserVerses.length);
          
          setReorderedUserVerses(updatedUserVerses);
          
          const updatedCollection = {
            ...current,
            userVerses: updatedUserVerses,
            notes: notes,
            verseOrder: updatedVerseOrder,
          };
          setEditingCollection(updatedCollection);
          // Also update the ref to keep it in sync
          reorderedUserVersesRef.current = updatedUserVerses;
          
          console.log('Successfully added verse to collection. New verseOrder:', updatedVerseOrder);
        } catch (error) {
          console.error('Error in addUserVerseToCollection:', error);
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
                // Use verseOrder from editingCollection to determine display order, but fallback to array order
                const verseOrder = editingCollection?.verseOrder;
                let allItems: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
                
                if (verseOrder && verseOrder.trim()) {
                  // Order by verseOrder if it exists
                  const orderArray = verseOrder.split(',').filter(ref => ref.trim() !== '');
                  const verseMap = new Map(reorderedUserVerses.map(uv => [uv.readableReference?.trim().toLowerCase(), uv]));
                  const noteMap = new Map(notes.map(n => [n.id, n]));
                  const ordered: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
                  const unordered: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
                  
                  orderArray.forEach(ref => {
                    const trimmedRef = ref.trim();
                    const verseKey = trimmedRef.toLowerCase();
                    if (verseMap.has(verseKey)) {
                      ordered.push({type: 'verse', data: verseMap.get(verseKey)!});
                      verseMap.delete(verseKey);
                    } else if (noteMap.has(trimmedRef)) {
                      ordered.push({type: 'note', data: noteMap.get(trimmedRef)!});
                      noteMap.delete(trimmedRef);
                    }
                  });
                  
                  verseMap.forEach(verse => unordered.push({type: 'verse', data: verse}));
                  noteMap.forEach(note => unordered.push({type: 'note', data: note}));
                  
                  allItems = [...ordered, ...unordered];
                } else {
                  // If no verseOrder, use array order directly
                  allItems = [
                    ...reorderedUserVerses.map(uv => ({type: 'verse' as const, data: uv})),
                    ...notes.map(n => ({type: 'note' as const, data: n}))
                  ];
                }
                
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
              <AddPassage 
                onAddPassage={addPassage} 
                onClickPlus={clickPlus}
                onAddPassageVerses={addUserVerseToCollection}
              />
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
