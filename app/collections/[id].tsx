import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Dimensions, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { Dialog, Divider, Portal, Snackbar, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';
import CollectionNoteItem from '../components/collectionNote';
import PracticeModeModal from '../components/practiceModeModal';
import SaveVerseToCollectionSheet from '../components/saveVerseToCollectionSheet';
import ShareCollectionSheet from '../components/shareCollectionSheet';
import ShareVerseSheet from '../components/shareVerseSheet';
import { CollectionContentSkeleton } from '../components/skeleton';
import { formatISODate, getUTCTimestamp } from '../dateUtils';
import { addUserVersesToNewCollection, createCollectionDB, createNote, deleteCollection, deleteNote, deleteUserVerse, getCollectionById, getMostRecentCollectionId, getNotesByVerseReference, getUserCollections, getUserVersesPopulated, insertUserVerse, refreshUser, updateCollectionDB, updateCollectionsOrder, updateNote, VerseNote } from '../db';
import { Collection, CollectionNote, useAppStore, UserVerse, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

// Helper function to convert date strings to Date objects in userVerses
function convertUserVerseDates(userVerses: UserVerse[]): UserVerse[] {
  return userVerses.map(uv => ({
    ...uv,
    lastPracticed: uv.lastPracticed ? (uv.lastPracticed instanceof Date ? uv.lastPracticed : new Date(uv.lastPracticed)) : undefined,
    dateMemorized: uv.dateMemorized ? (uv.dateMemorized instanceof Date ? uv.dateMemorized : new Date(uv.dateMemorized)) : undefined,
    dateAdded: uv.dateAdded ? (uv.dateAdded instanceof Date ? uv.dateAdded : new Date(uv.dateAdded)) : undefined,
    dueDate: uv.dueDate ? (uv.dueDate instanceof Date ? uv.dueDate : new Date(uv.dueDate)) : undefined,
  }));
}

function orderByDateAdded(userVerses: UserVerse[]): UserVerse[] {
  return [...userVerses].sort((a, b) => {
    const dateA = getUTCTimestamp(a.dateAdded);
    const dateB = getUTCTimestamp(b.dateAdded);
    return dateB - dateA;
  });
}

function orderByProgress(userVerses: UserVerse[]): UserVerse[] {
  return [...userVerses].sort((a, b) => {
    const aProgress = a.progressPercent || 0;
    const bProgress = b.progressPercent || 0;
    return bProgress - aProgress;
  });
}

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

function orderVersesAndNotes(userVerses: UserVerse[], notes: CollectionNote[], verseOrder?: string): Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> {
  if (!verseOrder || !verseOrder.trim()) {
    // If no verseOrder, return verses first, then notes
    const result: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
    userVerses.forEach(uv => result.push({type: 'verse', data: uv}));
    notes.forEach(note => result.push({type: 'note', data: note}));
    return result;
  }
  
  const orderArray = verseOrder.split(',').filter(ref => ref.trim() !== '').map(ref => ref.trim());
  const verseMap = new Map<string, UserVerse>();
  const noteMap = new Map<string, CollectionNote>();
  const ordered: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
  const unordered: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
  
  // Create maps for quick lookup
  // For verses, use lowercase for case-insensitive matching
  userVerses.forEach(uv => {
    if (uv.readableReference) {
      const key = uv.readableReference.trim().toLowerCase();
      if (!verseMap.has(key)) {
        verseMap.set(key, uv);
      }
    }
  });
  
  // For notes, use exact ID match (note IDs are typically UUIDs or timestamps, so exact match)
  // Store notes with both trimmed and original ID for flexible matching
  const noteIdMap = new Map<string, string>(); // Maps normalized IDs to original keys
  notes.forEach(note => {
    if (note.id) {
      const noteId = note.id.trim();
      noteMap.set(noteId, note);
      // Also store a mapping for case-insensitive lookup if needed
      noteIdMap.set(noteId.toLowerCase(), noteId);
    }
  });
  
  // First, add items in the order specified
  // Check notes first since note IDs are unique and specific
  orderArray.forEach(ref => {
    const trimmedRef = ref.trim();
    let matched = false;
    
    // First, try to match as a note ID (exact match)
    if (noteMap.has(trimmedRef)) {
      ordered.push({type: 'note', data: noteMap.get(trimmedRef)!});
      noteMap.delete(trimmedRef);
      matched = true;
    } else if (noteMap.size > 0) {
      // Try case-insensitive note ID match
      const lowerRef = trimmedRef.toLowerCase();
      if (noteIdMap.has(lowerRef)) {
        const actualNoteId = noteIdMap.get(lowerRef)!;
        if (noteMap.has(actualNoteId)) {
          ordered.push({type: 'note', data: noteMap.get(actualNoteId)!});
          noteMap.delete(actualNoteId);
          noteIdMap.delete(lowerRef);
          matched = true;
        }
      } else {
        // Last resort: check if trimmedRef matches any note ID (handles whitespace/case issues)
        for (const [noteId, note] of noteMap.entries()) {
          if (noteId === trimmedRef || noteId.trim() === trimmedRef || noteId.toLowerCase() === trimmedRef.toLowerCase()) {
            ordered.push({type: 'note', data: note});
            noteMap.delete(noteId);
            if (noteIdMap.has(noteId.toLowerCase())) {
              noteIdMap.delete(noteId.toLowerCase());
            }
            matched = true;
            break;
          }
        }
      }
    }
    
    // If not matched as a note, try to match as a verse reference (case-insensitive)
    if (!matched) {
      const verseKey = trimmedRef.toLowerCase();
      if (verseMap.has(verseKey)) {
        ordered.push({type: 'verse', data: verseMap.get(verseKey)!});
        verseMap.delete(verseKey);
        matched = true;
      }
    }
  });
  
  // Then add any items not in the order (verses first, then notes)
  verseMap.forEach(verse => {
    unordered.push({type: 'verse', data: verse});
  });
  noteMap.forEach(note => {
    unordered.push({type: 'note', data: note});
  });
  
  return [...ordered, ...unordered];
}

export default function Index() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const setUser = useAppStore((state) => state.setUser);
  const updateCollection = useAppStore((state) => state.updateCollection);
  const deleteCollectionStore = useAppStore((state) => state.removeCollection);
  const params = useLocalSearchParams();
  const setCollectionsSheetControls = useAppStore((state) => state.setCollectionsSheetControls);

    const navigation = useNavigation();

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    const [loadingVerses, setLoadingVerses] = useState(false);
    const [userVerses, setUserVerses] = useState<UserVerse[]>([]);
  const [orderedUserVerses, setOrderedUserVerses] = useState<UserVerse[]>([]);
  const [orderedItems, setOrderedItems] = useState<Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}>>([]);
  const [versesSortBy, setVersesSortBy] = useState(0); // 0 = custom order (verseOrder) or date added, 1 = progress
    const [isVersesSettingsSheetOpen, setIsVersesSettingsSheetOpen] = useState(false);
    const [isCreatingCopy, setIsCreatingCopy] = useState(false);
    const [practiceModeModalVisible, setPracticeModeModalVisible] = useState(false);
    
    const collectionSettingsSheetRef = useRef<BottomSheet>(null);
    const versesSettingsSheetRef = useRef<BottomSheet>(null);
    const userVerseSettingsSheetRef = useRef<BottomSheet>(null);
    const noteSettingsSheetRef = useRef<BottomSheet>(null);
    
    const collectionSettingsSnapPoints = useMemo(() => ['50%'], []);
    const versesSettingsSnapPoints = useMemo(() => ['40%'], []);
    const userVerseSettingsSnapPoints = useMemo(() => ['40%'], []);
    const noteSettingsSnapPoints = useMemo(() => ['35%'], []);
    
    const [isUserVerseSettingsSheetOpen, setIsUserVerseSettingsSheetOpen] = useState(false);
    const [isNoteSettingsSheetOpen, setIsNoteSettingsSheetOpen] = useState(false);
    const [isShareSheetVisible, setIsShareSheetVisible] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [deleteDialogCollection, setDeleteDialogCollection] = useState<Collection | undefined>(undefined);
    const [isDeletingCollection, setIsDeletingCollection] = useState(false);
    const isFetchingRef = useRef(false);
    const shouldReloadPracticeList = useAppStore((state) => state.shouldReloadPracticeList);
    const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
    const [selectedUserVerse, setSelectedUserVerse] = useState<UserVerse | null>(null);
    const [selectedNote, setSelectedNote] = useState<CollectionNote | null>(null);
    const [showSaveToCollectionSheet, setShowSaveToCollectionSheet] = useState(false);
    const [showShareVerseSheet, setShowShareVerseSheet] = useState(false);
    const [pickedCollection, setPickedCollection] = useState<Collection | undefined>(undefined);
    const [userVerseActionLoading, setUserVerseActionLoading] = useState(false);
    const [creatingNewCollection, setCreatingNewCollection] = useState(false);
    
    const [notesDialogVisible, setNotesDialogVisible] = useState(false);
    const [addNoteDialogVisible, setAddNoteDialogVisible] = useState(false);
    const [selectedUserVerseForNotes, setSelectedUserVerseForNotes] = useState<UserVerse | null>(null);
    const [userVerseNotes, setUserVerseNotes] = useState<VerseNote[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [isCreatingNote, setIsCreatingNote] = useState(false);
    const [isDeletingNote, setIsDeletingNote] = useState(false);
    const [isUpdatingNote, setIsUpdatingNote] = useState(false);
    const [editingNote, setEditingNote] = useState<VerseNote | null>(null);
    const [editNoteText, setEditNoteText] = useState('');
    const [passagesWithNotes, setPassagesWithNotes] = useState<Set<string>>(new Set());
    
    const collection = useAppStore((state) =>
      state.collections.find((c) => c.collectionId?.toString() === params.id)
  );
  
  useEffect(() => {
    if (collection) {
      console.log('Collection changed:', collection.title, 'has verses?', 
        collection.userVerses?.[0]?.verses?.length > 0);
    }
  }, [collection]);

  useEffect(() => {
    (async () => {
      if (!collection?.collectionId) return;
      try {
      } catch {}
    })();
  }, [collection?.collectionId]);

  const handleLearnMode = useCallback(async () => {
    if (!selectedUserVerse) return;
    router.push('/practiceSession');
  }, [selectedUserVerse]);

  const handleCreateCopy = async () => {
    if (!collection) return;
    
    // Check collection limit based on paid status
    const maxCollections = user.isPaid ? 40 : 5;
    const createdByMeCount = collections.filter((c) => (c.authorUsername ?? c.username) === user.username).length;
    if (createdByMeCount >= maxCollections) {
      if (!user.isPaid) {
        router.push('/pro');
        return;
      }
      setSnackbarMessage('You can create up to 40 collections');
      setSnackbarVisible(true);
      return;
    }
    if ((collection.userVerses?.length ?? 0) > 30) {
      setSnackbarMessage('Collections can contain up to 30 passages');
      setSnackbarVisible(true);
      return;
    }
    
    setIsCreatingCopy(true);
    try {
      const duplicateCollection = {
        ...collection,
        title: `${collection.title} (Copy)`,
        collectionId: undefined,
        authorUsername: collection.authorUsername ?? user.username,
        username: user.username,
      };

      await createCollectionDB(duplicateCollection, user.username);
      const newCollectionId = await getMostRecentCollectionId(user.username);

      if (collection.userVerses && collection.userVerses.length > 0) {
        await addUserVersesToNewCollection(collection.userVerses, newCollectionId);
      }

      const updatedCollections = await getUserCollections(user.username);
      setCollections(updatedCollections);

      const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
      const newOrder = currentOrder ? `${currentOrder},${newCollectionId}` : newCollectionId.toString();
      const updatedUser = { ...user, collectionsOrder: newOrder };
      setUser(updatedUser);

      try {
        await updateCollectionsOrder(newOrder, user.username);
      } catch (error) {
        console.error('Failed to update collections order:', error);
      }

      const refreshedUser = await refreshUser(user.username);
      setUser(refreshedUser);
    } catch (error) {
      console.error('Failed to create collection copy:', error);
      const message = error instanceof Error ? error.message : 'Failed to create collection copy';
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } finally {
      setIsCreatingCopy(false);
    }
  };

  const hideDeleteDialog = () => {
    setDeleteDialogVisible(false);
    setDeleteDialogCollection(undefined);
  };

  const deleteCollectionHandle = async () => {
    const collectionId = deleteDialogCollection?.collectionId;
    if (!collectionId || isDeletingCollection) return;
    
    setIsDeletingCollection(true);
    try {
      deleteCollectionStore(collectionId);
      await deleteCollection(deleteDialogCollection!);
      setShouldReloadPracticeList(true);
      
      const currentOrder = user.collectionsOrder || '';
      const orderArray = currentOrder.split(',').filter(id => id.trim() !== collectionId.toString()).join(',');
      const updatedUser = { ...user, collectionsOrder: orderArray };
      setUser(updatedUser);
      
      try {
        await updateCollectionsOrder(orderArray, user.username);
      } catch (error) {
        console.error('Failed to update collections order:', error);
      }
      
      try {
        const refreshedUser = await refreshUser(user.username);
        setUser(refreshedUser);
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
      
      hideDeleteDialog();
      router.back();
    } catch (error) {
      console.error('Failed to delete collection:', error);
      setSnackbarMessage('Failed to delete collection');
      setSnackbarVisible(true);
    } finally {
      setIsDeletingCollection(false);
    }
  };

useEffect(() => {
  if (collection) {
    setCollectionsSheetControls({ openSettingsSheet, collection });
  }
}, [collection]);

useEffect(() => {
  if (!collection || !shouldReloadPracticeList) return;
  
  const reloadCollection = async () => {
    try {
      console.log('🔄 Reloading collection after practice completion');
      const colToSend = { ...collection, UserVerses: collection.userVerses ?? [] };
      const data = await getUserVersesPopulated(colToSend);
      setUserVerses(convertUserVerseDates(data.userVerses ?? []));
      updateCollection(data);
      setShouldReloadPracticeList(false);
    } catch (err) {
      console.error('Failed to reload collection after practice:', err);
    }
  };
  
  reloadCollection();
}, [shouldReloadPracticeList, collection, updateCollection, setShouldReloadPracticeList]);

useFocusEffect(
  useCallback(() => {
    if (!collection) return;
    
    const firstUserVerse = collection.userVerses && collection.userVerses.length > 0 ? collection.userVerses[0] : null;
    const areVersesPopulated = firstUserVerse && firstUserVerse.verses && firstUserVerse.verses.length > 0;
    
    if (areVersesPopulated) {
      console.log('✅ Using cached userVerses for collection:', collection.title);
      setUserVerses(convertUserVerseDates(collection.userVerses));
      return;
    }
    
    if (isFetchingRef.current) return;
    
    console.log('🔄 Fetching populated userVerses for collection:', collection.title);
    
    const fetchPopulated = async () => {
      isFetchingRef.current = true;
      setLoadingVerses(true);
      try {
        const colToSend = { ...collection, UserVerses: collection.userVerses ?? [] };
        const data = await getUserVersesPopulated(colToSend);
        console.log('✅ Fetched and cached userVerses for collection:', collection.title);
        const populatedUserVerses = convertUserVerseDates(data.userVerses ?? []);
        
        // Load notes before replacing skeletons
        if (populatedUserVerses.length > 0 && user?.username) {
          const notesMap = new Set<string>();
          const passagesToCheck = populatedUserVerses.slice(0, 20);
          
          for (const userVerse of passagesToCheck) {
            if (!userVerse.readableReference) continue;
            try {
              const allNotes = await getNotesByVerseReference(userVerse.readableReference, user.username);
              const privateNotes = allNotes.filter((note: VerseNote) => !note.isPublic);
              if (privateNotes.length > 0) {
                notesMap.add(userVerse.readableReference);
              }
            } catch (error) {
              // Silently fail for individual note checks
              console.error('Failed to check notes for passage:', userVerse.readableReference);
            }
          }
          
          setPassagesWithNotes(notesMap);
        }
        
        setUserVerses(populatedUserVerses);
        updateCollection(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingVerses(false);
        isFetchingRef.current = false;
      }
    };
    
    fetchPopulated();
  }, [collection?.collectionId, collection?.verseOrder, updateCollection])
);

useEffect(() => {
  if (!userVerses || userVerses.length === 0) {
    setOrderedUserVerses([]);
    return;
  }
  const seenReferences = new Set<string>();
  const uniqueUserVerses = userVerses.filter((uv) => {
    if (!uv.readableReference) return true;
    if (seenReferences.has(uv.readableReference)) {
      return false;
    }
    seenReferences.add(uv.readableReference);
    return true;
  });
  
  let ordered: UserVerse[] = [];
  
  if (versesSortBy === 0) {
    // Use custom order (verseOrder) if available, otherwise use date added
    if (collection?.verseOrder && collection.verseOrder.trim()) {
      ordered = orderByVerseOrder(uniqueUserVerses, collection.verseOrder);
    } else {
      ordered = orderByDateAdded(uniqueUserVerses);
    }
  } else if (versesSortBy === 1) {
    ordered = orderByProgress(uniqueUserVerses);
  } else {
    ordered = uniqueUserVerses;
  }
  
  setOrderedUserVerses(ordered);
  
  // Also create ordered items (verses + notes) for display
  if (versesSortBy === 0 && collection?.verseOrder && collection.verseOrder.trim()) {
    // Use verseOrder to order both verses and notes
    const items = orderVersesAndNotes(uniqueUserVerses, collection.notes || [], collection.verseOrder);
    setOrderedItems(items);
    
    // Debug: log if notes are being ordered correctly
    if (collection.notes && collection.notes.length > 0) {
      const noteCountInOrder = items.filter(item => item.type === 'note').length;
      const noteCountInCollection = collection.notes.length;
      if (noteCountInOrder !== noteCountInCollection) {
        console.log('Note ordering issue:', {
          notesInCollection: noteCountInCollection,
          notesInOrder: noteCountInOrder,
          verseOrder: collection.verseOrder,
          noteIds: collection.notes.map(n => n.id)
        });
      }
    }
  } else {
    // For other sort modes, just show verses (notes will be at the end)
    const items: Array<{type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote}> = [];
    ordered.forEach(uv => items.push({type: 'verse', data: uv}));
    (collection?.notes || []).forEach(note => items.push({type: 'note', data: note}));
    setOrderedItems(items);
  }
}, [userVerses, versesSortBy, collection?.verseOrder, collection?.notes]);

// Check for notes when userVerses are loaded
useEffect(() => {
  if (!userVerses || userVerses.length === 0 || !user.username) return;
  
  const checkNotesForPassages = async () => {
    const notesMap = new Set<string>();
    // Check notes for each passage (limit to avoid too many API calls)
    const passagesToCheck = userVerses.slice(0, 20); // Check first 20 passages
    
    for (const userVerse of passagesToCheck) {
      if (!userVerse.readableReference) continue;
      try {
        const allNotes = await getNotesByVerseReference(userVerse.readableReference, user.username);
        const privateNotes = allNotes.filter((note: VerseNote) => !note.isPublic);
        if (privateNotes.length > 0) {
          notesMap.add(userVerse.readableReference);
        }
      } catch (error) {
        // Silently fail for individual note checks
        console.error('Failed to check notes for passage:', userVerse.readableReference);
      }
    }
    
    setPassagesWithNotes(notesMap);
  };
  
  checkNotesForPassages();
}, [userVerses, user.username]);

useLayoutEffect(() => {
  if (collection) {
    navigation.setOptions({
      title: collection.title,
    });
  }
}, [collection, navigation]);


// Animations


    const [sheetVisible, setSheetVisible] = useState(false);

  const offset = .1;
   const sheetHeight = height * (.89 + offset);
   const closedPosition = height;
    const openPosition = height - sheetHeight + (height * offset);
    const peekPosition = height;

  const settingsSheetHeight = height * (.50 + offset);
  const settingsClosedPosition = height;
  const settingsOpenPosition = height - settingsSheetHeight + (height * offset);

    const translateY = useSharedValue(closedPosition);
    const startY = useSharedValue(0);

    const settingsTranslateY = useSharedValue(settingsClosedPosition);
    const settingsStartY = useSharedValue(0);
    
    const versesSettingsTranslateY = useSharedValue(settingsClosedPosition);
    const versesSettingsStartY = useSharedValue(0);

      const sheetItemStyle = StyleSheet.create({
        settingsItem: {
          height: 50,
          justifyContent: 'center',
          alignItems: 'center'
        }
      })

    const openSheet = () => {
      translateY.value = withSpring(openPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
      setSheetVisible(true);
    };

    const openSettingsSheet = () => {
      collectionSettingsSheetRef.current?.snapToIndex(0);
    }

    const closeSheet = () => {
      translateY.value = withSpring(closedPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
      setSheetVisible(false);
    };

    const closeSettingsSheet = () => {
      collectionSettingsSheetRef.current?.close();
    }
    
    const handleCollectionSettingsSheetChange = useCallback((index: number) => {
      // Handle sheet state changes if needed
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const settingsAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: settingsTranslateY.value }],
    }));

    const backdropAnimatedStyle = useAnimatedStyle(() => {
      const sheetProgress =
        (settingsClosedPosition - settingsTranslateY.value) / settingsSheetHeight;
  
      const opacity = Math.min(1, Math.max(0, sheetProgress)) * 0.5;
  
      return {
        opacity,
        pointerEvents: opacity > 0.001 ? 'auto' : 'none',
      };
    });

    const settingsPanGesture = Gesture.Pan()
      .onBegin(() => {
        settingsStartY.value = settingsTranslateY.value;
      })
      .onUpdate(e => {
        settingsTranslateY.value = Math.max(settingsOpenPosition, settingsStartY.value + e.translationY);
      })
      .onEnd(() => {
        if (settingsTranslateY.value > settingsOpenPosition + 50) {
          settingsTranslateY.value = withSpring(settingsClosedPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
        } else {
          settingsTranslateY.value = withSpring(settingsOpenPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
        }
      })

    const panGesture = Gesture.Pan()
      .onBegin(() => {
        startY.value = translateY.value;
      })
      .onUpdate(e => {
        translateY.value = Math.max(openPosition, Math.min(peekPosition, startY.value + e.translationY));
      })
      .onEnd(() => {
        if (translateY.value > openPosition + 50) {
          translateY.value = withSpring(peekPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
        } else {
          translateY.value = withSpring(openPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
        }
      });

const openVersesSettingsSheet = () => {
  setIsVersesSettingsSheetOpen(true);
  versesSettingsSheetRef.current?.snapToIndex(0);
};

const closeVersesSettingsSheet = () => {
  setIsVersesSettingsSheetOpen(false);
  versesSettingsSheetRef.current?.close();
};

const handleVersesSettingsSheetChange = useCallback((index: number) => {
  setIsVersesSettingsSheetOpen(index !== -1);
}, []);

const openUserVerseSettingsSheet = (userVerse: UserVerse) => {
  if (showSaveToCollectionSheet) {
    setShowSaveToCollectionSheet(false);
  }
  if (showShareVerseSheet) {
    setShowShareVerseSheet(false);
  }
  setSelectedUserVerse(userVerse);
  setIsUserVerseSettingsSheetOpen(true);
  userVerseSettingsSheetRef.current?.snapToIndex(0);
};

const closeUserVerseSettingsSheet = () => {
  setIsUserVerseSettingsSheetOpen(false);
  userVerseSettingsSheetRef.current?.close();
};

const handleUserVerseSettingsSheetChange = useCallback((index: number) => {
  setIsUserVerseSettingsSheetOpen(index !== -1);
  // Don't clear selectedUserVerse when sheet closes - it might be needed for modals
  // Only clear if modals are not being shown
  if (index === -1 && !showSaveToCollectionSheet && !showShareVerseSheet) {
    setSelectedUserVerse(null);
  }
}, [showSaveToCollectionSheet, showShareVerseSheet]);

const openNoteSettingsSheet = (note: CollectionNote) => {
  setSelectedNote(note);
  setIsNoteSettingsSheetOpen(true);
  noteSettingsSheetRef.current?.snapToIndex(0);
};

const closeNoteSettingsSheet = () => {
  setIsNoteSettingsSheetOpen(false);
  noteSettingsSheetRef.current?.close();
};

const handleNoteSettingsSheetChange = useCallback((index: number) => {
  setIsNoteSettingsSheetOpen(index !== -1);
  if (index === -1) {
    setSelectedNote(null);
  }
}, []);

const handleDeleteNote = useCallback(async () => {
  if (!collection?.collectionId || !selectedNote?.id) {
    closeNoteSettingsSheet();
    return;
  }
  closeNoteSettingsSheet();
  setUserVerseActionLoading(true);
  try {
    const remainingNotes = (collection.notes || []).filter(n => n.id !== selectedNote.id);
    const currentOrder = collection.verseOrder || '';
    const tokens = currentOrder.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const filteredTokens = tokens.filter(t => t !== selectedNote.id);
    const newOrder = filteredTokens.join(',');

    const updatedCollection: Collection = {
      ...collection,
      notes: remainingNotes,
      verseOrder: newOrder,
    };

    await updateCollectionDB(updatedCollection);
    updateCollection(updatedCollection);
    setSnackbarMessage('Note removed');
    setSnackbarVisible(true);
  } catch (err) {
    console.error('Failed to delete note:', err);
    setSnackbarMessage('Failed to remove note');
    setSnackbarVisible(true);
  } finally {
    setUserVerseActionLoading(false);
  }
}, [collection, selectedNote, updateCollection]);

// Notes functions for userVerses
const openNotesDialog = useCallback(async (userVerse: UserVerse) => {
  setSelectedUserVerseForNotes(userVerse);
  setNotesDialogVisible(true);
  setLoadingNotes(true);
  try {
    if (userVerse.readableReference && user.username) {
      const allNotes = await getNotesByVerseReference(userVerse.readableReference, user.username);
      const privateNotes = allNotes
        .filter((note: VerseNote) => !note.isPublic)
        .sort((a, b) => {
          const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          return dateB - dateA; // Most recent first
        });
      setUserVerseNotes(privateNotes);
      // Update passagesWithNotes
      if (privateNotes.length > 0) {
        setPassagesWithNotes(prev => new Set(prev).add(userVerse.readableReference));
      } else {
        setPassagesWithNotes(prev => {
          const next = new Set(prev);
          next.delete(userVerse.readableReference);
          return next;
        });
      }
    }
  } catch (error) {
    console.error('Failed to load notes:', error);
    setSnackbarMessage('Failed to load notes');
    setSnackbarVisible(true);
  } finally {
    setLoadingNotes(false);
  }
}, [user.username]);

const closeNotesDialog = useCallback(() => {
  setNotesDialogVisible(false);
  setSelectedUserVerseForNotes(null);
  setUserVerseNotes([]);
}, []);

const handleCreateNote = useCallback(async () => {
  if (!selectedUserVerseForNotes?.readableReference || !user.username || !newNoteText.trim()) {
    return;
  }
  
  setIsCreatingNote(true);
  try {
    const createdNote = await createNote(
      selectedUserVerseForNotes.readableReference,
      user.username,
      newNoteText.trim(),
      false // isPublic = false for private notes
    );
    setUserVerseNotes(prev => {
      const updated = [...prev, createdNote];
      return updated.sort((a, b) => {
        const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
        const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    });
    setPassagesWithNotes(prev => new Set(prev).add(selectedUserVerseForNotes.readableReference));
    setNewNoteText('');
    setAddNoteDialogVisible(false);
    setSnackbarMessage('Note created');
    setSnackbarVisible(true);
  } catch (error) {
    console.error('Failed to create note:', error);
    setSnackbarMessage('Failed to create note');
    setSnackbarVisible(true);
  } finally {
    setIsCreatingNote(false);
  }
}, [selectedUserVerseForNotes, user.username, newNoteText]);

const closeAddNoteDialog = useCallback(() => {
  setAddNoteDialogVisible(false);
  setNewNoteText('');
  setEditingNote(null);
  setEditNoteText('');
}, []);

const handleEditNote = useCallback((note: VerseNote) => {
  setEditingNote(note);
  setEditNoteText(note.text);
  setAddNoteDialogVisible(true);
}, []);

const handleUpdateNote = useCallback(async () => {
  if (!editingNote || !editNoteText.trim()) return;
  
  setIsUpdatingNote(true);
  try {
    const updatedNote = await updateNote(editingNote.id, editNoteText.trim());
    setUserVerseNotes(prev => {
      const updated = prev.map(n => n.id === editingNote.id ? updatedNote : n);
      return updated.sort((a, b) => {
        const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
        const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    });
    setEditingNote(null);
    setEditNoteText('');
    setAddNoteDialogVisible(false);
    setSnackbarMessage('Note updated');
    setSnackbarVisible(true);
  } catch (error) {
    console.error('Failed to update note:', error);
    setSnackbarMessage('Failed to update note');
    setSnackbarVisible(true);
  } finally {
    setIsUpdatingNote(false);
  }
}, [editingNote, editNoteText]);

const handleDeleteVerseNote = useCallback(async (noteId: number) => {
  if (!selectedUserVerseForNotes?.readableReference) return;
  
  setIsDeletingNote(true);
  try {
    await deleteNote(noteId);
    const remainingNotes = userVerseNotes.filter(n => n.id !== noteId);
    setUserVerseNotes(remainingNotes);
    
    // Update passagesWithNotes
    if (remainingNotes.length === 0) {
      setPassagesWithNotes(prev => {
        const next = new Set(prev);
        next.delete(selectedUserVerseForNotes.readableReference);
        return next;
      });
    }
    
    setSnackbarMessage('Note deleted');
    setSnackbarVisible(true);
  } catch (error) {
    console.error('Failed to delete note:', error);
    setSnackbarMessage('Failed to delete note');
    setSnackbarVisible(true);
  } finally {
    setIsDeletingNote(false);
  }
}, [selectedUserVerseForNotes, userVerseNotes]);


const versesSettingsAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: versesSettingsTranslateY.value }],
}));

const versesBackdropAnimatedStyle = useAnimatedStyle(() => {
  const sheetProgress =
    (settingsClosedPosition - versesSettingsTranslateY.value) / settingsSheetHeight;

  const opacity = Math.min(1, Math.max(0, sheetProgress)) * 0.5;

  return {
    opacity,
    pointerEvents: opacity > 0.001 ? 'auto' : 'none',
  };
});

const versesSettingsPanGesture = Gesture.Pan()
  .onBegin(() => {
    versesSettingsStartY.value = versesSettingsTranslateY.value;
  })
  .onUpdate(e => {
    versesSettingsTranslateY.value = Math.max(settingsOpenPosition, versesSettingsStartY.value + e.translationY);
  })
  .onEnd(() => {
    if (versesSettingsTranslateY.value > settingsOpenPosition + 50) {
      versesSettingsTranslateY.value = withSpring(settingsClosedPosition, {       
  stiffness: 900,
  damping: 110,
  mass: 2,
  overshootClamping: true,
  energyThreshold: 6e-9,});
      setIsVersesSettingsSheetOpen(false);
      setSheetVisible(false);
    } else {
      versesSettingsTranslateY.value = withSpring(settingsOpenPosition, {       
  stiffness: 900,
  damping: 110,
  mass: 2,
  overshootClamping: true,
      energyThreshold: 6e-9,});
    }
  });


// End animations

const clickPlus = () => {

}

const addPassage = () => {
  closeSheet();

}

const reloadCollectionData = useCallback(async () => {
  if (!collection?.collectionId) return;
  try {
    const refreshed = await getCollectionById(collection.collectionId);
    if (refreshed) {
      setUserVerses(convertUserVerseDates(refreshed.userVerses ?? []));
      updateCollection(refreshed);
    }
  } catch (error) {
    console.error('Failed to reload collection:', error);
  }
}, [collection?.collectionId, updateCollection]);

const availableCollections = useMemo(() => {
  const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
  const currentUser = normalize(user.username);
  const currentCollectionId = collection?.collectionId;

  return collections.filter((col) => {
    if (!col.collectionId || col.collectionId === currentCollectionId) {
      return false;
    }

    const owner = normalize(col.username);
    const author = normalize(col.authorUsername);

    // Only show collections where the user is the owner (username matches)
    // OR where authorUsername matches AND username is not set (user created it before authorUsername was added)
    // Do NOT show collections where authorUsername != user.username (saved published collections)
    if (owner && owner === currentUser) {
      return true;
    }

    // Only show if author matches AND owner is not set (legacy collections) OR owner also matches
    if (author === currentUser && (!owner || owner === currentUser)) {
      return true;
    }

    // Favorites collection is always owned by the user
    if (col.favorites && currentUser.length > 0) {
      return true;
    }

    return false;
  });
}, [collections, user.username, collection?.collectionId]);

const handleSaveToCollection = useCallback(async () => {
  if (!selectedUserVerse || !pickedCollection?.collectionId) {
    return;
  }

  // Check verse limit per collection for free users
  if (!user.isPaid) {
    const targetCollection = collections.find(c => c.collectionId === pickedCollection.collectionId);
    const currentVerseCount = targetCollection?.userVerses?.length ?? 0;
    const maxVersesPerCollection = 10;
    
    if (currentVerseCount >= maxVersesPerCollection) {
      router.push('/pro');
      return;
    }
  }

  // Ensure readableReference is set
  if (!selectedUserVerse.readableReference || selectedUserVerse.readableReference.trim() === '') {
    setSnackbarMessage('Error: Verse reference is invalid');
    setSnackbarVisible(true);
    return;
  }

  setUserVerseActionLoading(true);
  try {
    await insertUserVerse({
      username: user.username,
      readableReference: selectedUserVerse.readableReference,
      collectionId: pickedCollection.collectionId,
      verses: selectedUserVerse.verses ?? [],
    });

    const updatedCollections = await getUserCollections(user.username);
    setCollections(updatedCollections);

    setSnackbarMessage(`Added to ${pickedCollection.title}`);
    setSnackbarVisible(true);
    setShowSaveToCollectionSheet(false);
    setPickedCollection(undefined);
    setSelectedUserVerse(null);
  } catch (error) {
    console.error('Failed to add user verse to collection:', error);
    const message = error instanceof Error ? error.message : 'Failed to add to collection';
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  } finally {
    setUserVerseActionLoading(false);
  }
}, [selectedUserVerse, pickedCollection, user.username, setCollections]);

const handleCreateNewCollectionFromVerse = useCallback(async (title: string) => {
  if (!selectedUserVerse || !title.trim()) return;

  // Check collection limit based on paid status
  const maxCollections = user.isPaid ? 40 : 5;
  if (collections.length >= maxCollections) {
    if (!user.isPaid) {
      router.push('/pro');
      return;
    }
    setSnackbarMessage('You can create up to 40 collections');
    setSnackbarVisible(true);
    return;
  }

  // Ensure readableReference is set
  if (!selectedUserVerse.readableReference || selectedUserVerse.readableReference.trim() === '') {
    setSnackbarMessage('Error: Verse reference is invalid');
    setSnackbarVisible(true);
    return;
  }

  setCreatingNewCollection(true);
  try {
    const newCollection: Collection = {
      title: title.trim(),
      username: user.username,
      authorUsername: user.username,
      visibility: 'Private',
      userVerses: [],
      notes: [],
      favorites: false,
    };

    await createCollectionDB(newCollection, user.username);
    const newCollectionId = await getMostRecentCollectionId(user.username);

    await insertUserVerse({
      username: user.username,
      readableReference: selectedUserVerse.readableReference,
      collectionId: newCollectionId,
      verses: selectedUserVerse.verses ?? [],
    });

    const updatedCollections = await getUserCollections(user.username);
    setCollections(updatedCollections);

    setSnackbarMessage(`Created "${title.trim()}" and added passage`);
    setSnackbarVisible(true);
    setShowSaveToCollectionSheet(false);
    setPickedCollection(undefined);
    setSelectedUserVerse(null);
  } catch (error) {
    console.error('Failed to create collection:', error);
    setSnackbarMessage('Failed to create collection');
    setSnackbarVisible(true);
  } finally {
    setCreatingNewCollection(false);
  }
}, [selectedUserVerse, user.username, collections.length, setCollections]);

// Handle Android back button to close sheets
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showSaveToCollectionSheet) {
        setShowSaveToCollectionSheet(false);
        return true;
      }
      if (showShareVerseSheet) {
        setShowShareVerseSheet(false);
        return true;
      }
      if (isUserVerseSettingsSheetOpen) {
        closeUserVerseSettingsSheet();
        return true;
      }
      if (sheetVisible) {
        closeSheet();
        closeSettingsSheet();
        closeVersesSettingsSheet();
        return true; // Prevent default back action
      }
      if (isVersesSettingsSheetOpen) {
        closeVersesSettingsSheet();
        return true; // Prevent default back action
      }
      // If no sheets are open, allow default back action to navigate away
      return false;
    });

    return () => backHandler.remove();
  }, [sheetVisible, isVersesSettingsSheetOpen, isUserVerseSettingsSheetOpen, showSaveToCollectionSheet, showShareVerseSheet]);

    if (loadingVerses) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <ScrollView style={styles.scrollContainer} contentContainerStyle={{ padding: 20 }}>
                    <CollectionContentSkeleton />
                </ScrollView>
            </View>
        )
    } else {
      const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
  const isOwnedCollection = (() => {
    if (!collection) return false;
    const owner = collection.username ? normalize(collection.username) : undefined;
    const author = collection.authorUsername ? normalize(collection.authorUsername) : undefined;
    const currentUser = normalize(user.username);

    if (!owner) {
      return author ? author === currentUser : currentUser.length > 0;
    }

    if (owner !== currentUser) {
      return false;
    }

    if (author && author !== owner) {
      return false;
    }

    return true;
  })();

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
  {/* Published Collection Metadata */}
  {collection && collection.authorUsername && 
   collection.authorUsername.toLowerCase().trim() !== user.username.toLowerCase().trim() && (
    <View style={{ 
      width: '100%', 
      marginBottom: 24, 
      marginTop: 20,
      borderRadius: 12 
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="person-outline" size={18} color={theme.colors.onSurfaceVariant} />
        <Text style={{ 
          ...styles.tinyText, 
          marginLeft: 8, 
          color: theme.colors.onSurfaceVariant,
          fontSize: 14 
        }}>
          Author: {collection.authorUsername}
        </Text>
      </View>
      {collection.dateCreated && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={18} color={theme.colors.onSurfaceVariant} />
          <Text style={{ 
            ...styles.tinyText, 
            marginLeft: 8, 
            color: theme.colors.onSurfaceVariant,
            fontSize: 14 
          }}>
            Created: {formatISODate(collection.dateCreated)}
          </Text>
        </View>
      )}
    </View>
  )}

  <View style={{ width: '100%' }}>
    {(versesSortBy === 0 && collection?.verseOrder && collection.verseOrder.trim() 
      ? orderedItems 
      : [
          ...orderedUserVerses.map(uv => ({type: 'verse' as const, data: uv})),
          ...(collection?.notes || []).map(note => ({type: 'note' as const, data: note}))
        ]
    ).map((item, itemIndex) => {
      if (item.type === 'note') {
        const note = item.data;
        return (
          <CollectionNoteItem
            key={note.id || `note-${itemIndex}`}
            note={note}
            isOwned={isOwnedCollection}
            onMenuPress={() => openNoteSettingsSheet(note)}
          />
        );
      }
      
      const userVerse = item.data;
      return (
        <View key={userVerse.readableReference || `userVerse-${itemIndex}`} style={{minWidth: '100%', marginBottom: 20}}>
          <View style={{minWidth: '100%', borderRadius: 3}}>
            <View>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -5}}>
                <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>
                  {userVerse.readableReference || ''}
                </Text>
                {isOwnedCollection ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <TouchableOpacity
                      activeOpacity={0.1}
                      onPress={() => openNotesDialog(userVerse)}
                      style={{ padding: 8, marginTop: -20, marginRight: -10 }}
                    >
                      <Ionicons name="document-text-outline" size={20} color={theme.colors.onBackground} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.1}
                      onPress={() => openUserVerseSettingsSheet(userVerse)}
                      style={{ padding: 8, marginTop: -20 }}
                    >
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.onBackground} />
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
              {(userVerse.verses || []).map((verse, verseIndex) => (
                <View key={verse.verse_reference || `${userVerse.readableReference}-verse-${verseIndex}`}>
                  <View>
                    <Text style={{
                      ...styles.text, 
                      fontFamily: 'Noto Serif', 
                      fontSize: 16, 
                      color: theme.colors.verseText
                    }}>
                      {verse.verse_Number != null ? `${String(verse.verse_Number)}: ` : ''}{verse.text || ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{alignItems: 'stretch', justifyContent: 'space-between'}}>
              <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                <View style={{alignItems: 'center', justifyContent: 'center'}}>

                {/* UserVerse Stats Section */}
                  <View style={{alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 0, padding: 0, borderRadius: 8, marginLeft: -5, flexDirection: 'row'}}>
                    {isOwnedCollection && passagesWithNotes.has(userVerse.readableReference) && (
                      <View style={{ marginTop: 4, marginLeft: 4 }}>
                        <Ionicons 
                          name="document-text-outline" 
                          size={14} 
                          color={theme.colors.onSurfaceVariant} 
                          style={{ opacity: 0.7 }}
                        />
                      </View>
                    )}
                  </View>
                </View>
                <View>
                  <View style={{alignItems: 'center', marginTop: 4, marginRight: 8, gap: 16}}>
                    <TouchableOpacity
                      onPress={() => {
                        useAppStore.getState().setSelectedUserVerse(userVerse);
                        setSelectedUserVerse(userVerse);
                        setPracticeModeModalVisible(true);
                      }}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: 12,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: theme.colors.surface2,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="extension-puzzle-outline" size={20} color={theme.colors.onBackground} />
                        <Text style={{ fontFamily: 'Inter', fontSize: 15, color: theme.colors.onBackground }}>
                          Practice
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    {userVerse.collectionId && userVerse.dueDate ? (
                      <Text style={{
                        ...styles.tinyText, 
                        fontSize: 13, 
                        color: theme.colors.verseText, 
                        marginTop: -12, 
                        marginBottom: -10
                      }}>
                        Due {(() => {
                          if (!userVerse.dueDate) return '';
                          const dueDate = userVerse.dueDate instanceof Date ? userVerse.dueDate : new Date(userVerse.dueDate);
                          const today = new Date();
                          const diffTime = dueDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          if (diffDays > 1) return `in ${diffDays} days`;
                          if (diffDays === 1) return 'in 1 day';
                          if (diffDays === 0) return 'today';
                          if (diffDays === -1) return 'yesterday';
                          return `${Math.abs(diffDays)} days ago`;
                        })()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </View>
          <Divider style={{marginHorizontal: -50, marginTop: 20}} />
        </View>
      );
    })}
  </View>
  <View style={{height: 0}} />
</ScrollView>

        <Portal>
            {/* Collection Settings Bottom Sheet */}
            <BottomSheet
                ref={collectionSettingsSheetRef}
                index={-1}
                snapPoints={collectionSettingsSnapPoints}
                enablePanDownToClose
                enableOverDrag={false}
                android_keyboardInputMode="adjustResize"
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                onChange={handleCollectionSettingsSheetChange}
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
              >
              <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40 }}>
                <Divider />
                {isOwnedCollection ? (
                  <>
                    <TouchableOpacity
                      style={sheetItemStyle.settingsItem}
                      onPress={() => {
                        closeSettingsSheet();
                        const setEditingCollection = useAppStore.getState().setEditingCollection;
                        if (collection) {
                          setEditingCollection(collection);
                          router.push('../collections/editCollection');
                        }
                      }}>
                      <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Edit</Text>
                    </TouchableOpacity>
                    <Divider />
                    {collection && collection.userVerses && collection.userVerses.length > 0 && (
                      <>
                        <TouchableOpacity
                          style={sheetItemStyle.settingsItem}
                          onPress={() => {
                            closeSettingsSheet();
                            if (collection?.collectionId) {
                              router.push(`../collections/reorderExistingVerses?id=${collection.collectionId}`);
                            }
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Reorder Passages</Text>
                        </TouchableOpacity>
                        <Divider />
                      </>
                    )}
                    <TouchableOpacity
                      style={sheetItemStyle.settingsItem}
                      onPress={async () => {
                        closeSettingsSheet();
                        await handleCreateCopy();
                      }}
                      disabled={isCreatingCopy}>
                      {isCreatingCopy ? (
                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                      ) : (
                        <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Create Copy</Text>
                      )}
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity
                      style={sheetItemStyle.settingsItem}
                      onPress={async () => {
                        if (!collection) return;
                        
                        try {
                          closeSettingsSheet();
                          const newVisibility = collection.visibility === 'Public' ? 'Private' : 'Public';
                          const updatedCollection = { ...collection, visibility: newVisibility };
                          
                          // Update in database
                          await updateCollectionDB(updatedCollection);
                          
                          // Update in store
                          updateCollection(updatedCollection);
                        } catch (error) {
                          console.error('Failed to toggle visibility:', error);
                          alert('Failed to update collection visibility');
                        }
                      }}>
                      <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>
                        {collection?.visibility === 'Public' ? 'Make Not Visible to Friends' : 'Make Visible to Friends'}
                      </Text>
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity
                      style={sheetItemStyle.settingsItem}
                      onPress={() => {
                        closeSettingsSheet();
                        setIsShareSheetVisible(true);
                      }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Share</Text>
                      </View>
                    </TouchableOpacity>
                    {collection?.title !== 'Favorites' && (
                      <>
                        <Divider />
                        <TouchableOpacity
                          style={sheetItemStyle.settingsItem}
                          onPress={() => {
                            if (!collection?.collectionId) return;
                            closeSettingsSheet();
                            const setPublishingCollection = useAppStore.getState().setPublishingCollection;
                            setPublishingCollection(collection);
                            router.push('./publishCollection');
                          }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Publish</Text>
                          </View>
                        </TouchableOpacity>
                        <Divider />
                        <TouchableOpacity
                          style={sheetItemStyle.settingsItem}
                          onPress={() => {
                            if (!collection) return;
                            closeSettingsSheet();
                            setDeleteDialogVisible(true);
                            setDeleteDialogCollection(collection);
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>Delete</Text>
                        </TouchableOpacity>
                        <Divider />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={sheetItemStyle.settingsItem}
                      onPress={() => {
                        if (!collection) return;
                        closeSettingsSheet();
                        setDeleteDialogVisible(true);
                        setDeleteDialogCollection(collection);
                      }}>
                      <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>Remove</Text>
                    </TouchableOpacity>
                    <Divider />
                  </>
                )}
              </BottomSheetView>
            </BottomSheet>
            </Portal>

            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: sheetHeight,
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  paddingTop: 20,
                  paddingBottom: 80,
                  zIndex: 15,
                  elevation: 15,
                  boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)',
                },
                animatedStyle,
              ]}
            >
              <GestureDetector gesture={panGesture}>
                <View style={{ padding: 20, marginTop: -20 }}>
                  <View
                    style={{
                      width: 70,
                      height: 2,
                      borderRadius: 20,
                      borderWidth: 2,
                      alignSelf: 'center',
                      borderColor: theme.colors.onBackground,
                    }}
                  ></View>
                </View>
              </GestureDetector>
              {isOwnedCollection && (
                <AddPassage onAddPassage={addPassage} onClickPlus={clickPlus} />
              )}
            </Animated.View>

            {/* Verses Settings Bottom Sheet */}
            <Portal>
              <BottomSheet
                ref={versesSettingsSheetRef}
                index={-1}
                snapPoints={versesSettingsSnapPoints}
                enablePanDownToClose
                enableOverDrag={false}
                android_keyboardInputMode="adjustResize"
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                onChange={handleVersesSettingsSheetChange}
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
              >
              <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40 }}>
                <Text style={{...styles.text, fontSize: 20, fontWeight: '600', marginBottom: 20, marginTop: 10, alignSelf: 'center'}}>Sort Passages By:</Text>
                <Divider />
                <TouchableOpacity
                  style={sheetItemStyle.settingsItem}
                  onPress={() => {
                    setVersesSortBy(0);
                    closeVersesSettingsSheet();
                  }}>
                  <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: versesSortBy === 0 ? '700' : '500' }}>Date Added</Text>
                </TouchableOpacity>
                <Divider />
                <TouchableOpacity
                  style={sheetItemStyle.settingsItem}
                  onPress={() => {
                    setVersesSortBy(1);
                    closeVersesSettingsSheet();
                  }}>
                  <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: versesSortBy === 1 ? '700' : '500' }}>Progress Percent</Text>
                </TouchableOpacity>
                <Divider />
              </BottomSheetView>
            </BottomSheet>
            </Portal>

            {/* Note Settings Bottom Sheet */}
            <Portal>
              <BottomSheet
                ref={noteSettingsSheetRef}
                index={-1}
                snapPoints={noteSettingsSnapPoints}
                enablePanDownToClose
                enableOverDrag={false}
                android_keyboardInputMode="adjustResize"
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                onChange={handleNoteSettingsSheetChange}
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
              >
                <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40 }}>
                  {selectedNote ? (
                    <>
                      <TouchableOpacity
                        style={{ height: 50, justifyContent: 'center', alignItems: 'center' }}
                        onPress={handleDeleteNote}
                        disabled={userVerseActionLoading}
                      >
                        {userVerseActionLoading ? (
                          <ActivityIndicator size="small" color={theme.colors.onBackground} />
                        ) : (
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>
                            Remove Note
                          </Text>
                        )}
                      </TouchableOpacity>
                      <Divider />
                    </>
                  ) : null}
                </BottomSheetView>
              </BottomSheet>
            </Portal>

            {/* User Verse Settings Bottom Sheet */}
            <Portal>
              <BottomSheet
                ref={userVerseSettingsSheetRef}
                index={-1}
                snapPoints={userVerseSettingsSnapPoints}
                enablePanDownToClose
                enableOverDrag={false}
                android_keyboardInputMode="adjustResize"
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                onChange={handleUserVerseSettingsSheetChange}
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
              >
              <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40 }}>
                {selectedUserVerse ? (
                  <>
                    <TouchableOpacity
                      style={sheetItemStyle.settingsItem}
                      onPress={() => {
                        const userVerseToSave = selectedUserVerse;
                        closeUserVerseSettingsSheet();
                        // Wait for sheet to close before opening modal
                        setTimeout(() => {
                          if (userVerseToSave) {
                            setSelectedUserVerse(userVerseToSave);
                            setPickedCollection(undefined);
                            setShowSaveToCollectionSheet(true);
                          }
                        }, 300);
                      }}
                      disabled={userVerseActionLoading}
                    >
                      <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Add to another collection</Text>
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity
                      style={sheetItemStyle.settingsItem}
                      onPress={() => {
                        const userVerseToShare = selectedUserVerse;
                        closeUserVerseSettingsSheet();
                        // Wait for sheet to close before opening modal
                        setTimeout(() => {
                          if (userVerseToShare) {
                            setSelectedUserVerse(userVerseToShare);
                            setShowShareVerseSheet(true);
                          }
                        }, 300);
                      }}
                      disabled={userVerseActionLoading}
                    >
                      <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Share</Text>
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity
                      style={sheetItemStyle.settingsItem}
                      onPress={async () => {
                        if (!selectedUserVerse.id || !collection?.collectionId) {
                          closeUserVerseSettingsSheet();
                          return;
                        }
                        closeUserVerseSettingsSheet();
                        setUserVerseActionLoading(true);
                        try {
                          await deleteUserVerse({
                            id: selectedUserVerse.id,
                            username: user.username,
                            readableReference: selectedUserVerse.readableReference,
                            collectionId: collection.collectionId,
                            verses: selectedUserVerse.verses ?? [],
                          });
                          await reloadCollectionData();
                          const updatedCollections = await getUserCollections(user.username);
                          setCollections(updatedCollections);
                          setShouldReloadPracticeList(true);
                          setSnackbarMessage('Passage removed from collection');
                          setSnackbarVisible(true);
                        } catch (error) {
                          console.error('Failed to delete user verse:', error);
                          setSnackbarMessage('Failed to delete passage');
                          setSnackbarVisible(true);
                        } finally {
                          setUserVerseActionLoading(false);
                        }
                      }}
                      disabled={userVerseActionLoading || !selectedUserVerse?.id}
                    >
                      {userVerseActionLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                      ) : (
                        <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>
                          Delete
                        </Text>
                      )}
                    </TouchableOpacity>
                    <Divider />
                  </>
                ) : null}
              </BottomSheetView>
            </BottomSheet>
            </Portal>

            {/* Save Verse to Collection Sheet */}
            {selectedUserVerse && selectedUserVerse.verses && selectedUserVerse.verses.length > 0 ? (
              <SaveVerseToCollectionSheet
                visible={showSaveToCollectionSheet}
                verse={selectedUserVerse.verses[0] as Verse}
                collections={availableCollections}
                pickedCollection={pickedCollection}
                setPickedCollection={setPickedCollection}
                loading={userVerseActionLoading}
                onCancel={() => {
                  setShowSaveToCollectionSheet(false);
                  setPickedCollection(undefined);
                  // Only clear selectedUserVerse if sheet is also closed
                  if (!isUserVerseSettingsSheetOpen) {
                    setSelectedUserVerse(null);
                  }
                }}
                onConfirm={handleSaveToCollection}
                confirming={userVerseActionLoading}
                onCreateNewCollection={handleCreateNewCollectionFromVerse}
                creatingNewCollection={creatingNewCollection}
              />
            ) : null}

            {/* Share Verse Sheet */}
            {selectedUserVerse ? (
              <ShareVerseSheet
                visible={showShareVerseSheet}
                userVerses={[selectedUserVerse]}
                onClose={() => {
                  setShowShareVerseSheet(false);
                  // Only clear selectedUserVerse if sheet is also closed
                  if (!isUserVerseSettingsSheetOpen) {
                    setSelectedUserVerse(null);
                  }
                }}
                onShareSuccess={(friendUsername) => {
                  setSnackbarMessage(`Passage shared with ${friendUsername}!`);
                  setSnackbarVisible(true);
                }}
                onShareError={() => {
                  setSnackbarMessage('Failed to share passage');
                  setSnackbarVisible(true);
                }}
              />
            ) : null}

          {/* Share Collection Sheet */}
          <ShareCollectionSheet
            visible={isShareSheetVisible}
            collection={collection}
            onClose={() => setIsShareSheetVisible(false)}
            onShareSuccess={(friendUsername) => {
              setSnackbarMessage(`Collection shared with ${friendUsername}!`);
              setSnackbarVisible(true);
            }}
            onShareError={() => {
              setSnackbarMessage('Failed to share collection');
              setSnackbarVisible(true);
            }}
          />

          {/* Delete Dialog */}
          <Portal>
            <Dialog visible={deleteDialogVisible} onDismiss={hideDeleteDialog}>
              <Dialog.Content>
                <Text style={{...styles.tinyText}}>Are you sure you want to {isOwnedCollection ? 'delete' : 'remove'} the collection "{deleteDialogCollection?.title}"?</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <View style={{ flexDirection: 'row', width: '100%' }}>
                  <View style={{ width: '50%', paddingRight: 8 }}>
                    <TouchableOpacity
                      onPress={hideDeleteDialog}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: '50%', paddingLeft: 8 }}>
                    {isDeletingCollection ? (
                      <View style={{ height: 30, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={theme.colors.error} />
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={deleteCollectionHandle}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>
                          {isOwnedCollection ? 'Delete' : 'Remove'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Dialog.Actions>
            </Dialog>
          </Portal>

          {/* Notes Modal */}
          <Portal>
            <Modal
              visible={notesDialogVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={closeNotesDialog}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              >
                <View
                  style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
                >
                  <View
                    style={{ 
                      backgroundColor: theme.colors.surface, 
                      borderRadius: 12, 
                      width: '90%', 
                      maxWidth: 400, 
                      maxHeight: '70%', 
                      padding: 20,
                      flexDirection: 'column'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Text style={{ 
                        fontSize: 20,
                        fontWeight: '600',
                        fontFamily: 'Inter',
                        color: theme.colors.onBackground,
                      }}>
                        {selectedUserVerseForNotes?.readableReference}
                      </Text>
                      <TouchableOpacity
                        onPress={closeNotesDialog}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: theme.colors.surface2,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="close" size={20} color={theme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>

                    <Text style={{ 
                      fontSize: 20, 
                      color: theme.colors.onSurfaceVariant, 
                      marginBottom: 16,
                      marginTop: -15,
                      fontFamily: 'Inter'
                    }}>
                      Private Notes
                    </Text>

                    {loadingNotes ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                      </View>
                    ) : userVerseNotes.length === 0 ? (
                      <Text style={{ 
                        color: theme.colors.onSurfaceVariant, 
                        fontSize: 14, 
                        fontStyle: 'italic', 
                        textAlign: 'center', 
                        padding: 20
                      }}>
                        No private notes
                      </Text>
                    ) : (
                      <ScrollView 
                        contentContainerStyle={{ paddingBottom: 10 }}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {userVerseNotes.map((note, index) => (
                          <View key={note.id} style={{ marginBottom: index < userVerseNotes.length - 1 ? 16 : 0 }}>
                            <View style={{
                              borderRadius: 8,
                            }}>
                              <Text style={{ 
                                color: theme.colors.onBackground, 
                                fontSize: 14, 
                                lineHeight: 20
                              }}>
                                {note.text}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                {note.createdDate && (
                                  <Text style={{ 
                                    color: theme.colors.onSurfaceVariant, 
                                    fontSize: 11
                                  }}>
                                    {formatISODate(new Date(note.createdDate))}
                                  </Text>
                                )}
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                  <TouchableOpacity
                                    onPress={() => handleEditNote(note)}
                                    disabled={isDeletingNote || isUpdatingNote}
                                    style={{
                                      padding: 4,
                                    }}
                                  >
                                    <Ionicons name="pencil" size={15} color={theme.colors.onBackground} style={{marginTop: 1}} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => handleDeleteVerseNote(note.id)}
                                    disabled={isDeletingNote || isUpdatingNote}
                                    style={{
                                      padding: 4,
                                    }}
                                  >
                                    {isDeletingNote ? (
                                      <ActivityIndicator size="small" color={theme.colors.error} />
                                    ) : (
                                      <Ionicons name="trash-outline" size={16} color={theme.colors.onBackground} />
                                    )}
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                            {index < userVerseNotes.length - 1 && (
                              <Divider style={{ marginTop: 12 }} />
                            )}
                          </View>
                        ))}
                      </ScrollView>
                    )}

                    <TouchableOpacity
                      style={{...styles.button_outlined, marginTop: 20}}
                      activeOpacity={0.7}
                      onPress={() => {
                        setNewNoteText('');
                        setEditingNote(null);
                        setEditNoteText('');
                        setAddNoteDialogVisible(true);
                      }}
                    >
                      <Ionicons name="add" size={26} color={theme.colors.onBackground} />
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </Portal>

          {/* Add/Edit Note Dialog */}
          <Portal>
            <Modal
              visible={addNoteDialogVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={closeAddNoteDialog}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              >
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
                  activeOpacity={1}
                  onPress={closeAddNoteDialog}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={{ 
                      backgroundColor: theme.colors.surface, 
                      borderRadius: 12, 
                      width: '90%', 
                      maxWidth: 400, 
                      padding: 20 
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Text style={{ 
                        fontSize: 20,
                        fontWeight: '600',
                        fontFamily: 'Inter',
                        color: theme.colors.onBackground,
                      }}>
                        {editingNote ? 'Edit Note' : 'Add Note'}
                      </Text>
                      <TouchableOpacity
                        onPress={closeAddNoteDialog}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: theme.colors.surface2,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="close" size={20} color={theme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>

                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 20}}>
                      <Ionicons name="lock-closed" size={16} color={theme.colors.verseText} style={{marginTop: 2, marginRight: 6}} />
                      <Text style={{...styles.tinyText, fontSize: 13, color: theme.colors.verseText}}>
                        Notes are encrypted before they are stored.
                      </Text>
                    </View>

                    <TextInput
                      value={editingNote ? editNoteText : newNoteText}
                      onChangeText={editingNote ? setEditNoteText : setNewNoteText}
                      placeholder="Enter your note..."
                      placeholderTextColor={theme.colors.onSurfaceVariant}
                      multiline
                      numberOfLines={6}
                      style={{
                        color: theme.colors.onBackground,
                        fontSize: 14,
                        fontFamily: 'Inter',
                        backgroundColor: 'transparent',
                        borderRadius: 8,
                        padding: 12,
                        minHeight: 120,
                        textAlignVertical: 'top',
                        borderWidth: 2,
                        borderColor: theme.colors.gray,
                        marginBottom: 16,
                      }}
                    />

                    <TouchableOpacity
                      style={{...styles.button_outlined, marginTop: 20}}
                      activeOpacity={0.7}
                      onPress={editingNote ? handleUpdateNote : handleCreateNote}
                      disabled={(editingNote ? !editNoteText.trim() : !newNoteText.trim()) || isCreatingNote || isUpdatingNote}
                    >
                      {(isCreatingNote || isUpdatingNote) ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        editingNote ? (
                          <Ionicons name="checkmark" size={26} color={theme.colors.onBackground} />
                        ) : (
                          <Ionicons name="checkmark" size={26} color={theme.colors.onBackground} />
                        )
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </Modal>
          </Portal>
          
          {/* Snackbar */}
          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}
            style={{ backgroundColor: theme.colors.surface }}
          >
            <Text style={{ color: theme.colors.onSurface, fontFamily: 'Inter' }}>
              {snackbarMessage}
            </Text>
          </Snackbar>

          {/* Practice Mode Modal */}
          <PracticeModeModal
            visible={practiceModeModalVisible}
            onClose={() => {
              setPracticeModeModalVisible(false);
              setSelectedUserVerse(null);
            }}
            onSelectLearn={handleLearnMode}
          />
        </View>
      );
    }
}