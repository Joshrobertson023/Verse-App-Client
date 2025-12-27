import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Banner, Dialog, Divider, Portal, Snackbar } from 'react-native-paper';
import Animated, { interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Button from '../components/Button';
import CollectionItem from '../components/collectionItem';
import PracticeModeModal from '../components/practiceModeModal';
import ShareCollectionSheet from '../components/shareCollectionSheet';
import ShareVerseSheet from '../components/shareVerseSheet';
import { formatISODate, getUTCTimestamp } from '../dateUtils';
import { addUserVersesToNewCollection, createCollectionDB, createNote, deleteCollection, deleteNote, getMostRecentCollectionId, getNotesByVerseReference, getPublicNotesByVerseReference, getSiteBanner, getUserCollections, getVerseSearchResult, likeNote, refreshUser, updateCollectionDB, updateCollectionsOrder as updateCollectionsOrderDB, updateCollectionsSortBy, unlikeNote, updateNote, VerseNote } from '../db';
import { Collection, SearchData, useAppStore, UserVerse, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

// Generates a RFC4122-like GUID string
function generateGUID() {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function orderCompletion(collections: Collection[]): Collection[] {
  const collectionData: { collection: Collection; averageProgress: number }[] = [];
  
  for (const col of collections) {
    let progressPercentages: number[] = [];
    for (const uv of col.userVerses) {
      if (uv.progressPercent) {
        progressPercentages.push(uv.progressPercent || 0.0);
      }
    }
    
    if (progressPercentages.length === 0) {
      collectionData.push({ collection: col, averageProgress: 0 });
    } else {
      const percentageSum = progressPercentages.reduce((accumulator, currentValue) => {
        return accumulator + currentValue;
      }, 0);
      const percentageAverage = percentageSum / progressPercentages.length;
      collectionData.push({ collection: col, averageProgress: percentageAverage });
    }
  }
  
  // Sort by average progress (lowest first)
  collectionData.sort((a, b) => a.averageProgress - b.averageProgress);
  
  return collectionData.map(item => item.collection);
}

function orderNewest(collections: Collection[]): Collection[] {
  const withDates = collections.filter(c => c.dateCreated);
  const withoutDates = collections.filter(c => !c.dateCreated);
  
  const sortedWithDates = withDates.sort((a: Collection, b: Collection) => {
    const dateA = getUTCTimestamp(a.dateCreated);
    const dateB = getUTCTimestamp(b.dateCreated);
    return dateB - dateA;
  });
  
  return [...sortedWithDates, ...withoutDates];
}

function orderCustom(array: Collection[], idString: string | undefined): Collection[] {
  if (!idString || array.length === 0) return array;

  const orderedIds = idString.split(',').map(id => id.trim()).filter(id => id.length > 0);
  const lookupMap = new Map<string, Collection>();
  for (const collection of array) {
    if (collection.collectionId) {
      lookupMap.set(String(collection.collectionId), collection);
    }
  }
  const reorderedArray: Collection[] = [];
  for (const id of orderedIds) {
    const col = lookupMap.get(id);
    if (col) {
      reorderedArray.push(col);
    }
  }
  const remainingCollections = array.filter(c => !reorderedArray.find(rc => rc.collectionId === c.collectionId));
  return [...reorderedArray, ...remainingCollections];
}

export default function Index() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);
  const homePageStats = useAppStore((state) => state.homePageStats);
  const setCollections = useAppStore((state) => state.setCollections);
  const setUser = useAppStore((state) => state.setUser);
  const siteBanner = useAppStore((state) => state.siteBanner);
  const setSiteBanner = useAppStore((state) => state.setSiteBanner);
  const collectionReviewMessage = useAppStore((state) => state.collectionReviewMessage);
  const setCollectionReviewMessage = useAppStore((state) => state.setCollectionReviewMessage);
  const activeCollectionsSortBy = user.collectionsSortBy ?? 1;
  const [settingsCollection, setSettingsCollection] = useState<Collection | undefined>(undefined);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const [isCreatingCopy, setIsCreatingCopy] = useState(false);
  const [isCollectionsSettingsSheetOpen, setIsCollectionsSettingsSheetOpen] = useState(false);
  
  // Bottom sheet refs
  const settingsSheetRef = useRef<BottomSheet>(null);
  const collectionsSettingsSheetRef = useRef<BottomSheet>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteDialogCollection, setDeleteDialogCollection] = useState<Collection | undefined>(undefined);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [isShareSheetVisible, setIsShareSheetVisible] = useState(false);
  const [versesToShare, setVersesToShare] = useState<UserVerse[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const deleteCollectionStore = useAppStore((state) => state.removeCollection);
  const [localSortBy, setLocalSortBy] = useState(0);
  const [orderedCollections, setOrderedCollections] = useState<Collection[]>(collections);
  const [isSettingsCollectionPublished, setIsSettingsCollectionPublished] = useState<boolean | null>(null);
  const [shouldReloadPracticeList, setShouldReloadPracticeList] = useState(false);
  const [isBannerLoading, setIsBannerLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [reviewMessageDismissed, setReviewMessageDismissed] = useState(false);
  const [searchDialogVisible, setSearchDialogVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [practiceModeModalVisible, setPracticeModeModalVisible] = useState(false);
  const [selectedVodUserVerse, setSelectedVodUserVerse] = useState<UserVerse | null>(null);
  
  // Notes state for verse of the day
  const [vodPublicNotesCount, setVodPublicNotesCount] = useState(0);
  const [vodPublicNotes, setVodPublicNotes] = useState<VerseNote[]>([]);
  const [vodPrivateNotes, setVodPrivateNotes] = useState<VerseNote[]>([]);
  const [loadingVodNotes, setLoadingVodNotes] = useState(false);
  const [loadingVodPublicNotes, setLoadingVodPublicNotes] = useState(false);
  const [notesDialogVisible, setNotesDialogVisible] = useState(false);
  const [addNoteDialogVisible, setAddNoteDialogVisible] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isPublicNote, setIsPublicNote] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<VerseNote | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  
  const noteCardWidth = useMemo(() => Dimensions.get('window').width * 0.75, []);

  const computeOwnership = (collection?: Collection) => {
    if (!collection) return false;
    const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
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
  };

  const isOwnedCollection = computeOwnership(settingsCollection);

  const deleteDialogIsOwned = computeOwnership(deleteDialogCollection);

  const [visible, setVisible] = React.useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  // Verse of the Day from store
  const verseOfDay = useAppStore((state) => state.verseOfDay);
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = useMemo(() => Math.min(screenWidth - 50, 580), [screenWidth]);

  // Collection picker state for Verse of the Day Save functionality
  const [showVodCollectionPicker, setShowVodCollectionPicker] = useState(false);
  const [selectedVodVerse, setSelectedVodVerse] = useState<Verse | null>(null);
  const [pickedVodCollection, setPickedVodCollection] = useState<Collection | undefined>(undefined);
  const [isAddingVodToCollection, setIsAddingVodToCollection] = useState(false);
  const [isCreatingNewVodCollection, setIsCreatingNewVodCollection] = useState(false);
  const [newVodCollectionTitle, setNewVodCollectionTitle] = useState('');
  const verseSaveAdjustments = useAppStore((state) => state.verseSaveAdjustments);
  const incrementVerseSaveAdjustment = useAppStore((state) => state.incrementVerseSaveAdjustment);


  const isSameUTCDate = (a: Date, b: Date) => {
    return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
  };

  const currentVodText = verseOfDay && verseOfDay.verses && verseOfDay.verses.length > 0
    ? verseOfDay.verses.map(v => v.text).join(' ')
    : '';
  // Get max saved and memorized counts across all verses in the verse of day
  const currentVodSavedCount = verseOfDay && verseOfDay.verses && verseOfDay.verses.length > 0
    ? Math.max(...verseOfDay.verses.map(v => v.users_Saved_Verse ?? 0))
    : 0;
  const currentVodMemorizedCount = verseOfDay && verseOfDay.verses && verseOfDay.verses.length > 0
    ? Math.max(...verseOfDay.verses.map(v => v.users_Memorized ?? 0))
    : 0;
  const displayedVodSavedCount = currentVodSavedCount + (verseOfDay?.readableReference ? (verseSaveAdjustments[verseOfDay.readableReference] ?? 0) : 0);

  // Fetch notes when verse of day is loaded
  useEffect(() => {
    const fetchVodNotes = async () => {
      if (!verseOfDay?.readableReference || !user.username) {
        setVodPublicNotesCount(0);
        setVodPublicNotes([]);
        setVodPrivateNotes([]);
        return;
      }

      try {
        // Use the verse reference from the first verse, as that's what notes are stored with
        // This ensures we match the exact format stored in the database
        const verseReference = verseOfDay.verses && verseOfDay.verses.length > 0 
          ? verseOfDay.verses[0].verse_reference 
          : verseOfDay.readableReference;
        
        // Fetch public notes to get count (and we'll use this data when dialog opens)
        const publicNotes = await getPublicNotesByVerseReference(verseReference, user.username);
        setVodPublicNotesCount(publicNotes.length);
        // Sort public notes by most recent (they'll be re-sorted by likes when dialog opens)
        setVodPublicNotes(publicNotes.sort((a, b) => {
          const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          return dateB - dateA; // Most recent first
        }));
        
        // Fetch private notes
        const allNotes = await getNotesByVerseReference(verseReference, user.username);
        const privateNotes = allNotes.filter(note => !note.isPublic);
        setVodPrivateNotes(privateNotes.sort((a, b) => {
          const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          return dateB - dateA; // Most recent first
        }));
      } catch (error) {
        console.error('Failed to fetch verse of day notes:', error);
        setVodPublicNotesCount(0);
        setVodPublicNotes([]);
        setVodPrivateNotes([]);
      }
    };

    fetchVodNotes();
  }, [verseOfDay?.readableReference, verseOfDay?.verses, user.username]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsBannerLoading(true);
      try {
        const result = await getSiteBanner();
        if (!isMounted) {
          return;
        }
        const normalizedMessage = result.hasBanner && result.message ? result.message.trim() : '';
        const message = normalizedMessage.length > 0 ? normalizedMessage : null;
        setSiteBanner({ message });
      } catch (error) {
        console.error('Failed to load site banner', error);
      } finally {
        if (isMounted) {
          setIsBannerLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [setSiteBanner]);

  useEffect(() => {
    setBannerDismissed(false);
  }, [siteBanner.message]);


  const handleSaveVodVerse = (readableReference: string) => {
    if (!verseOfDay || !verseOfDay.verses || verseOfDay.verses.length === 0) {
      setSnackbarMessage('Verse not loaded yet. Please wait...');
      setSnackbarVisible(true);
      return;
    }
    // Use the first verse from the verse of day
    const verse = verseOfDay.verses[0];
    // Ensure verse_reference is set
    const formattedVerse: Verse = {
      ...verse,
      verse_reference: verse.verse_reference || readableReference,
    };
    setSelectedVodVerse(formattedVerse);
    setPickedVodCollection(undefined);
    setNewVodCollectionTitle('');
    setShowVodCollectionPicker(true);
  };

  const handleVodInputChange = (text: string) => {
    setNewVodCollectionTitle(text);
    // Clear selected collection when user starts typing
    if (text.trim() && pickedVodCollection) {
      setPickedVodCollection(undefined);
    }
  };

  const handleVodCollectionSelect = (collection: Collection) => {
    setPickedVodCollection(collection);
    // Clear input when selecting an existing collection
    setNewVodCollectionTitle('');
  };

  const handleCreateNewVodCollection = async () => {
    if (!selectedVodVerse || !user?.username || isCreatingNewVodCollection || !newVodCollectionTitle.trim()) return;
    
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

    // Ensure verse_reference is set
    if (!selectedVodVerse.verse_reference) {
      setSnackbarMessage('Error: Verse reference is missing');
      setSnackbarVisible(true);
      return;
    }

    const readableReference = selectedVodVerse.verse_reference;
    const userVerse: UserVerse = {
      username: user.username,
      readableReference: readableReference,
      verses: [selectedVodVerse]
    };

    // Ensure readableReference is set
    if (!userVerse.readableReference || userVerse.readableReference.trim() === '') {
      setSnackbarMessage('Error: Verse reference is invalid');
      setSnackbarVisible(true);
      return;
    }

    setIsCreatingNewVodCollection(true);

    try {
      const finalTitle = newVodCollectionTitle.trim() === '' ? 'New Collection' : (newVodCollectionTitle.trim() === 'Favorites' ? 'Favorites-Other' : newVodCollectionTitle.trim());
      const newCollection: Collection = {
        title: finalTitle,
        authorUsername: user.username,
        username: user.username,
        visibility: 'private',
        verseOrder: `${readableReference},`,
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
      await updateCollectionsOrderDB(newOrder, user.username);

      const refreshedUser = await refreshUser(user.username);
      setUser(refreshedUser);

      incrementVerseSaveAdjustment(readableReference);
      setShowVodCollectionPicker(false);
      setSelectedVodVerse(null);
      setPickedVodCollection(undefined);
      setNewVodCollectionTitle('');
      setSnackbarMessage('Collection created and verse saved');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Failed to create collection:', error);
      setSnackbarMessage('Failed to create collection');
      setSnackbarVisible(true);
    } finally {
      setIsCreatingNewVodCollection(false);
    }
  };

  const handleAddVodToCollection = async () => {
    if (!pickedVodCollection || !selectedVodVerse || !user.username || isAddingVodToCollection) return;

    // Ensure verse_reference is set
    if (!selectedVodVerse.verse_reference) {
      setSnackbarMessage('Error: Verse reference is missing');
      setSnackbarVisible(true);
      return;
    }

    const readableReference = selectedVodVerse.verse_reference;
    const alreadyExists = pickedVodCollection.userVerses.some(
      uv => uv.readableReference === readableReference
    );

    if (alreadyExists) {
      setSnackbarMessage('This passage is already in the collection');
      setSnackbarVisible(true);
      setShowVodCollectionPicker(false);
      setSelectedVodVerse(null);
      setPickedVodCollection(undefined);
      return;
    }

    const userVerse: UserVerse = {
      username: user.username,
      readableReference: readableReference,
      verses: [selectedVodVerse]
    };

    // Ensure readableReference is set
    if (!userVerse.readableReference || userVerse.readableReference.trim() === '') {
      setSnackbarMessage('Error: Verse reference is invalid');
      setSnackbarVisible(true);
      return;
    }

    setIsAddingVodToCollection(true);

    try {
      await addUserVersesToNewCollection([userVerse], pickedVodCollection.collectionId!);
      
      const currentOrder = pickedVodCollection.verseOrder || '';
      const newOrder = currentOrder ? `${currentOrder}${readableReference},` : `${readableReference},`;
      
      const updatedCollection = {
        ...pickedVodCollection,
        userVerses: [...pickedVodCollection.userVerses, userVerse],
        verseOrder: newOrder,
      };
      
      await updateCollectionDB(updatedCollection);
      setCollections(collections.map(c =>
        c.collectionId === pickedVodCollection.collectionId ? updatedCollection : c
      ));

      incrementVerseSaveAdjustment(readableReference);
      setShowVodCollectionPicker(false);
      setSelectedVodVerse(null);
      setPickedVodCollection(undefined);
      setIsAddingVodToCollection(false);
      setSnackbarMessage('Verse added to collection!');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Error adding to collection:', error);
      setSnackbarMessage('Failed to add verse to collection');
      setSnackbarVisible(true);
      setIsAddingVodToCollection(false);
    }
  };

  const handleShareVodVerse = async (readableReference: string) => {
    // Check if the user has already saved this verse
    const savedUserVerse = collections
      .flatMap(col => col.userVerses || [])
      .find(uv => uv.readableReference?.toLowerCase().trim() === readableReference.toLowerCase().trim());
    
    if (savedUserVerse && savedUserVerse.id) {
      // Use the saved UserVerse
      setVersesToShare([savedUserVerse]);
    } else {
      // Use the verse of day UserVerse from store
      if (!verseOfDay || !verseOfDay.verses || verseOfDay.verses.length === 0) {
        setSnackbarMessage('Verse not loaded yet. Please wait...');
        setSnackbarVisible(true);
        return;
      }
      
      const userVerse: UserVerse = {
        username: user.username,
        readableReference: readableReference,
        verses: verseOfDay.verses
      };
      
      setVersesToShare([userVerse]);
    }
  };

  const handlePracticeVodVerse = (readableReference: string) => {
    if (!verseOfDay || !verseOfDay.verses || verseOfDay.verses.length === 0) {
      setSnackbarMessage('Verse not loaded yet. Please wait...');
      setSnackbarVisible(true);
      return;
    }
    
    const vodUserVerse: UserVerse = {
      username: user.username,
      readableReference: readableReference,
      verses: verseOfDay.verses
    };
    
    setSelectedVodUserVerse(vodUserVerse);
    // Set selectedUserVerse in store so practice session can use it
    const setSelectedUserVerse = useAppStore.getState().setSelectedUserVerse;
    setSelectedUserVerse(vodUserVerse);
    setPracticeModeModalVisible(true);
  };

  const handleLearnMode = useCallback(() => {
    if (!selectedVodUserVerse) return;
    
    router.push('/practiceSession');
  }, [selectedVodUserVerse]);

  // Notes handlers for verse of the day
  const openNotesDialog = useCallback(async () => {
    if (!verseOfDay?.readableReference || !user.username) return;
    
    setNotesDialogVisible(true);
    setLoadingVodPublicNotes(true);
    setLoadingVodNotes(true);
    try {
      // Use the verse reference from the first verse, as that's what notes are stored with
      // This ensures we match the exact format stored in the database
      const verseReference = verseOfDay.verses && verseOfDay.verses.length > 0 
        ? verseOfDay.verses[0].verse_reference 
        : verseOfDay.readableReference;
      
      // Refresh both public and private notes when opening dialog
      const [publicNotes, allNotes] = await Promise.all([
        getPublicNotesByVerseReference(verseReference, user.username),
        getNotesByVerseReference(verseReference, user.username)
      ]);
      
      // Sort public notes by most recent (they should already be sorted by likes on backend, but we want most recent here)
      const sortedPublicNotes = publicNotes.sort((a, b) => {
        const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
        const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
      setVodPublicNotes(sortedPublicNotes);
      // Update count from actual fetched notes
      setVodPublicNotesCount(sortedPublicNotes.length);
      
      const privateNotes = allNotes
        .filter((note: VerseNote) => !note.isPublic)
        .sort((a, b) => {
          const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          return dateB - dateA; // Most recent first
        });
      setVodPrivateNotes(privateNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setSnackbarMessage('Failed to load notes');
      setSnackbarVisible(true);
    } finally {
      setLoadingVodPublicNotes(false);
      setLoadingVodNotes(false);
    }
  }, [verseOfDay?.readableReference, user.username]);

  const closeNotesDialog = useCallback(() => {
    setNotesDialogVisible(false);
  }, []);

  const handleCreateNote = useCallback(async () => {
    if (!verseOfDay?.readableReference || !user.username || !newNoteText.trim()) {
      return;
    }
    
    setIsCreatingNote(true);
    try {
      // Use the verse reference from the first verse, as that's what notes are stored with
      const verseReference = verseOfDay.verses && verseOfDay.verses.length > 0 
        ? verseOfDay.verses[0].verse_reference 
        : verseOfDay.readableReference;
      
      const createdNote = await createNote(
        verseReference,
        user.username,
        newNoteText.trim(),
        isPublicNote // Use isPublicNote state
      );
      
      if (isPublicNote) {
        setVodPublicNotes(prev => {
          const updated = [...prev, createdNote];
          const sorted = updated.sort((a, b) => {
            const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
            const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
            return dateB - dateA; // Most recent first
          });
          // Update count from actual notes array
          setVodPublicNotesCount(sorted.length);
          return sorted;
        });
      } else {
        setVodPrivateNotes(prev => {
          const updated = [...prev, createdNote];
          return updated.sort((a, b) => {
            const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
            const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
            return dateB - dateA; // Most recent first
          });
        });
      }
      
      setNewNoteText('');
      setIsPublicNote(false);
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
  }, [verseOfDay?.readableReference, user.username, newNoteText, isPublicNote]);

  const closeAddNoteDialog = useCallback(() => {
    setAddNoteDialogVisible(false);
    setNewNoteText('');
    setEditingNote(null);
    setEditNoteText('');
    setIsPublicNote(false);
  }, []);

  const handleEditNote = useCallback((note: VerseNote) => {
    setEditingNote(note);
    setEditNoteText(note.text);
    setIsPublicNote(note.isPublic);
    setAddNoteDialogVisible(true);
  }, []);

  const handleUpdateNote = useCallback(async () => {
    if (!editingNote || !editNoteText.trim()) return;
    
    setIsUpdatingNote(true);
    try {
      const updatedNote = await updateNote(editingNote.id, editNoteText.trim());
      const wasPublic = editingNote.isPublic;
      
      if (wasPublic) {
        setVodPublicNotes(prev => {
          const updated = prev.map(n => n.id === editingNote.id ? updatedNote : n);
          return updated.sort((a, b) => {
            const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
            const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
            return dateB - dateA; // Most recent first
          });
        });
      } else {
        setVodPrivateNotes(prev => {
          const updated = prev.map(n => n.id === editingNote.id ? updatedNote : n);
          return updated.sort((a, b) => {
            const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
            const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
            return dateB - dateA; // Most recent first
          });
        });
      }
      
      setEditingNote(null);
      setEditNoteText('');
      setIsPublicNote(false);
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
    if (!verseOfDay?.readableReference || !user.username) return;
    
    // Use the verse reference from the first verse for consistency
    const verseReference = verseOfDay.verses && verseOfDay.verses.length > 0 
      ? verseOfDay.verses[0].verse_reference 
      : verseOfDay.readableReference;
    
    const noteToDelete = [...vodPublicNotes, ...vodPrivateNotes].find(n => n.id === noteId);
    const wasPublic = noteToDelete?.isPublic;
    
    setIsDeletingNote(true);
    try {
      await deleteNote(noteId);
      
      if (wasPublic) {
        setVodPublicNotes(prev => {
          const filtered = prev.filter(n => n.id !== noteId);
          // Update count from actual notes array
          setVodPublicNotesCount(filtered.length);
          return filtered;
        });
      } else {
        setVodPrivateNotes(prev => prev.filter(n => n.id !== noteId));
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
  }, [verseOfDay?.readableReference, verseOfDay?.verses, user.username, vodPublicNotes, vodPrivateNotes]);


  const hideDialog = () => setVisible(false);
  const hideDeleteDialog = () => {
    setDeleteDialogVisible(false);
    setIsDeletingCollection(false);
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSettingsSheetOpen) {
        closeSettingsSheet();
        return true;
      }
      if (isCollectionsSettingsSheetOpen) {
        closeCollectionsSettingsSheet();
        return true;
      }
      if (deleteDialogVisible) {
        setDeleteDialogVisible(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isSettingsSheetOpen, isCollectionsSettingsSheetOpen, deleteDialogVisible]);

  const deleteCollectionHandle = async () => {
    const collectionId = deleteDialogCollection?.collectionId;
    if (!collectionId || isDeletingCollection) return;
    
    setIsDeletingCollection(true);
    try {
      deleteCollectionStore(collectionId);
      await deleteCollection(deleteDialogCollection);
      setShouldReloadPracticeList(true);
      
      const currentOrder = user.collectionsOrder || '';
      const orderArray = currentOrder.split(',').filter(id => id.trim() !== collectionId.toString()).join(',');
      const updatedUser = { ...user, collectionsOrder: orderArray };
      setUser(updatedUser);
      
      try {
        await updateCollectionsOrderDB(orderArray, user.username);
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
    } catch (error) {
      console.error('Failed to delete collection:', error);
      setSnackbarMessage('Failed to delete collection');
      setSnackbarVisible(true);
    } finally {
      setIsDeletingCollection(false);
    }
  }

  const handleCreateCopy = async (collectionToCopy: Collection) => {
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
    
    if ((collectionToCopy.userVerses?.length ?? 0) > 30) {
      setSnackbarMessage('Collections can contain up to 30 passages');
      setSnackbarVisible(true);
      return;
    }

    setIsCreatingCopy(true);
    try {
      const duplicateCollection: Collection = {
        ...collectionToCopy,
        title: `${collectionToCopy.title} (Copy)`,
        collectionId: undefined,
        authorUsername: collectionToCopy.authorUsername ?? user.username,
        username: user.username,
      };

      await createCollectionDB(duplicateCollection, user.username);
      const newCollectionId = await getMostRecentCollectionId(user.username);

      if (collectionToCopy.userVerses && collectionToCopy.userVerses.length > 0) {
        await addUserVersesToNewCollection(collectionToCopy.userVerses, newCollectionId);
      }

      const updatedCollections = await getUserCollections(user.username);
      setCollections(updatedCollections);

      const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
      const newOrder = currentOrder ? `${currentOrder},${newCollectionId}` : newCollectionId.toString();
      const updatedUser = { ...user, collectionsOrder: newOrder };
      setUser(updatedUser);

      try {
        await updateCollectionsOrderDB(newOrder, user.username);
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

useEffect(() => { // Apparently this runs even if the user is not logged in
    if (useAppStore.getState().user.username === 'Default User') {
      router.replace('/(auth)/createName');
    }
    updateCollectionsOrder();
  }, [user]);

  // Refresh collections order when returning from reorder page
  useFocusEffect(
    useCallback(() => {
      updateCollectionsOrder();
    }, [collections])
  );

  useEffect(() => {
    if (!user.username || user.username === 'Default User') {
      setIsProfileDrawerOpen(false);
    }
  }, [user.username]);





  // Bottom sheet snap points
  const settingsSnapPoints = useMemo(() => ['45%'], []);
  const collectionsSettingsSnapPoints = useMemo(() => ['45%'], []);
  const openCollectionsSettingsSheet = () => {
    setIsCollectionsSettingsSheetOpen(true);
    // Use setTimeout to ensure state is updated before expanding
    setTimeout(() => {
      collectionsSettingsSheetRef.current?.expand();
    }, 0);
  };

  const closeCollectionsSettingsSheet = () => {
    collectionsSettingsSheetRef.current?.close();
  };

  const handleCollectionsSettingsSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setIsCollectionsSettingsSheetOpen(false);
    }
  }, []);

  const openSettingsSheet = () => {
    setIsSettingsSheetOpen(true);
    // Use setTimeout to ensure state is updated before expanding
    setTimeout(() => {
      settingsSheetRef.current?.expand();
    }, 0);
  };

  const closeSettingsSheet = () => {
    settingsSheetRef.current?.close();
  };

  const handleSettingsSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setIsSettingsSheetOpen(false);
    }
  }, []);







  const handleMenuPress = (collection: Collection) => {
    setSettingsCollection(collection);
    if (isSettingsSheetOpen) {
      closeSettingsSheet();
      setTimeout(() => {
        openSettingsSheet();
      }, 100);
    } else {
      openSettingsSheet();
    }
  }

  const sheetItemStyle = StyleSheet.create({
    settingsItem: {
      height: 50,
      justifyContent: 'center',
      alignItems: 'center'
    }
  })



  // ***************************************************
  //                Order Collections   
  // ***************************************************


  const updateCollectionsOrder = () => {
    const orderBy = useAppStore.getState().user.collectionsSortBy;
    const allCollections = useAppStore.getState().collections;
    const favorites = allCollections.filter(col => col.favorites || col.title === 'Favorites');
    const nonFavorites = allCollections.filter(col => !col.favorites && col.title !== 'Favorites');
    let ordered: Collection[] = [];
    
    switch (orderBy) {
      case 0: // custom order
        ordered = orderCustom(nonFavorites, user.collectionsOrder);
        break;
      case 1: // by newest modified
        ordered = orderNewest(nonFavorites);
        break;
      case 2: // by percent memorized
        ordered = orderCompletion(nonFavorites);
        break;
      case 3: // most overdue
        ordered = nonFavorites;
        break;
      default:
        ordered = nonFavorites;
    }
    
    setOrderedCollections([...favorites, ...ordered]);
  }

  const scrollY = useSharedValue(0);
  const [headerShadowOpacity, setHeaderShadowOpacity] = useState(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useAnimatedReaction(
    () => scrollY.value,
    (value) => {
      // Interpolate scroll position to shadow opacity (0 to 1)
      // Fade in shadow as user scrolls down from 0 to 20 pixels
      const opacity = interpolate(
        value,
        [0, 20],
        [0, 1],
        'clamp'
      );
      runOnJS(setHeaderShadowOpacity)(opacity);
    }
  ); 

  const AddButton = () => {
      const animatedStyle = useAnimatedStyle(() => {
      const translateY = interpolate(scrollY.value, [0, 150], [0, -100], 'clamp');
    const opacity = interpolate(scrollY.value, [0, 150], [1, 0], 'clamp');
      return {
        opacity,
        transform: [{ translateY }],
      };
    });

    return (
      <Animated.View
      style={[
        {
          position: 'absolute',
          top: 40,
          right: 20,
          zIndex: 10,
        }, animatedStyle]}
    >
      <TouchableOpacity
        style={{
          backgroundColor: theme.colors.background
        }}
        onPress={() => router.push('../collections/addnew')}
      >
        <Ionicons name="add" size={32} color={theme.colors.onBackground} />
      </TouchableOpacity>
    </Animated.View>
    )
  }

  const[bannerVisible, setBannerVisible] = useState(true);

  return (
    <>
      <Stack.Screen
        options={{
          headerShadowVisible: headerShadowOpacity > 0.1,
          headerStyle: {
            backgroundColor: theme.colors.background,
            // Animate shadow properties for smooth fade
            elevation: headerShadowOpacity > 0.1 ? 4 * headerShadowOpacity : 0,
            shadowOpacity: headerShadowOpacity,
            shadowOffset: { width: 0, height: headerShadowOpacity > 0.1 ? 2 : 0 },
            shadowRadius: headerShadowOpacity > 0.1 ? 4 : 0,
            shadowColor: '#000',
          } as any,
        }}
      />
      <View style={{ flex: 1 }}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
        {isBannerLoading && !siteBanner.message ? (
          <View style={{ width: '100%', marginBottom: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null}
        {siteBanner.message && !bannerDismissed ? (
          <Banner
            visible
            icon="information-outline"
            style={{
              width: '100%',
              marginBottom: 20,
              backgroundColor: theme.colors.surface
            }}
            actions={[
              {
                label: 'Close',
                onPress: () => setBannerDismissed(true)
              }
            ]}
          >
            <Text style={{ ...styles.tinyText, color: theme.colors.onSurface, fontFamily: 'Inter', marginRight: 12, height: '100%' }}>
              {siteBanner.message}
            </Text>
          </Banner>
        ) : null}

        {/* Collection Review Message */}
        {collectionReviewMessage && !reviewMessageDismissed ? (
          <Banner
            visible
            icon="information-outline"
            style={{
              width: '100%',
              marginBottom: 20,
              backgroundColor: theme.colors.surface
            }}
            actions={[
              {
                label: 'Close',
                onPress: () => {
                  setReviewMessageDismissed(true);
                  setCollectionReviewMessage(null);
                }
              }
            ]}
          >
            <Text style={{ ...styles.tinyText, fontFamily: 'Inter', marginRight: 12, height: '100%' }}>
              Your collection has been submitted and is currently under review. When it is approved, you will be notified.
            </Text>
          </Banner>
        ) : null}

        {/* Verse Of The Day */}
        <View style={{ width: '100%', marginBottom: 20 }}>
          <View style={{ paddingHorizontal: 2, marginBottom: 4, marginTop: -10 }}>
            <Text style={{ ...styles.tinyText, margin: 0, marginLeft: 15, fontSize: 13, opacity: 0.8 }}>Verse Of The Day</Text>
            </View>
          <View style={{ alignItems: 'center', width: '100%' }}>
            {verseOfDay && verseOfDay.readableReference ? (
                <View style={{ width: '100%' }}>
                <View style={{ backgroundColor: theme.colors.surface, alignItems: 'stretch', justifyContent: 'space-between', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: .15, shadowRadius: 6 }}>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontFamily: 'Noto Serif bold', fontSize: 22, color: theme.colors.onBackground }}>{verseOfDay.readableReference}</Text>
                      <TouchableOpacity activeOpacity={0.7} onPress={openNotesDialog} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="document-text-outline" size={20} color={theme.colors.onBackground} />
                        {vodPublicNotesCount > 0 && (
                          <Text style={{ fontSize: 14, color: theme.colors.onBackground, fontFamily: 'Inter', fontWeight: '500' }}>
                            {vodPublicNotesCount}
                          </Text>
                        )}
                      </TouchableOpacity>
                      </View>
                      <Text style={{ fontFamily: 'Noto Serif', fontSize: 16, lineHeight: 24, color: theme.colors.onBackground, marginBottom: 12 }} numberOfLines={5}>
                      {currentVodText || 'Loading verse...'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="people-outline" size={14} color={theme.colors.onSurfaceVariant} />
                          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
                            {displayedVodSavedCount} saved
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.onSurfaceVariant} />
                          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
                            {currentVodMemorizedCount} memorized
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 18 }}>
                    <TouchableOpacity activeOpacity={0.1} onPress={() => handleSaveVodVerse(verseOfDay.readableReference)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="bookmark-outline" size={18} color={theme.colors.onBackground} />
                          <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Save</Text>
                        </View>
                      </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.1} onPress={() => handlePracticeVodVerse(verseOfDay.readableReference)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="extension-puzzle-outline" size={18} color={theme.colors.onBackground} />
                          <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Practice</Text>
                        </View>
                      </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.1} onPress={() => handleShareVodVerse(verseOfDay.readableReference)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="share-social-outline" size={18} color={theme.colors.onBackground} />
                          <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Share</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
            ) : (
              <View style={{ paddingVertical: 40 }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </View>
        </View>


        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: -10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20 }}>
            <TouchableOpacity
              activeOpacity={0.1}
              onPress={() => setSearchDialogVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Search passages"
            >
              <Ionicons name="search" size={26} color={theme.colors.onBackground} />
            </TouchableOpacity>
          </View>
            <Text style={{ ...styles.subheading, marginBottom: 0 }}>My Verses</Text>
          <TouchableOpacity activeOpacity={0.1} onPress={() => openCollectionsSettingsSheet()}>
            <Ionicons name={"reorder-four"} size={24} color={theme.colors.onBackground}  />
          </TouchableOpacity>
        </View>
        <View style={styles.collectionsContainer}>

          {orderedCollections.map((collection) => {
            const itemKey = collection.collectionId ? `col-${collection.collectionId}` : `col-${generateGUID()}`;
            return (
              <React.Fragment key={itemKey}>
                <Divider style={{marginHorizontal: -50, marginTop: 10, marginBottom: -10}} />
                  <CollectionItem collection={collection} onMenuPress={handleMenuPress} />
              </React.Fragment>
            );
          })}

        </View>
        <View style={{height: 60}} />
      </Animated.ScrollView>
        
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 20,
            right: 10,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            zIndex: 10,
          }}
          activeOpacity={0.1}
          onPress={() => router.push('../collections/addnew')}
        >
          <Ionicons name="add" size={42} color={theme.colors.background} />
        </TouchableOpacity>

      {/* Settings Sheet */}
      <Portal>
        <BottomSheet
          ref={settingsSheetRef}
          index={isSettingsSheetOpen ? 0 : -1}
          snapPoints={settingsSnapPoints}
          enablePanDownToClose
          enableOverDrag={false}
          android_keyboardInputMode="adjustResize"
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          onChange={handleSettingsSheetChange}
          backgroundStyle={{ backgroundColor: theme.colors.surface }}
          handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
        >
        <BottomSheetView style={{ flex: 1 }}>
          <Divider style={{margin: 0}} />
          {isOwnedCollection ? (
            <>
              <TouchableOpacity
                style={sheetItemStyle.settingsItem}
                activeOpacity={0.1}
                onPress={() => {
                  closeSettingsSheet();
                  if (settingsCollection) {
                    const setEditingCollection = useAppStore.getState().setEditingCollection;
                    setEditingCollection(settingsCollection);
                    router.push('../collections/editCollection');
                  }
                }}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 8 }}>
                  <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Edit</Text>
                </View>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                style={sheetItemStyle.settingsItem}
                activeOpacity={0.1}
                onPress={async () => {
                  closeSettingsSheet();
                  if (settingsCollection) {
                    await handleCreateCopy(settingsCollection);
                  }
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
                activeOpacity={0.1}
                onPress={async () => {
                  if (!settingsCollection?.collectionId) return;
                  
                  try {
                    const newVisibility = settingsCollection.visibility === 'Public' ? 'Private' : 'Public';
                    const updatedCollection = {
                      ...settingsCollection,
                      visibility: newVisibility
                    };
                    await updateCollectionDB(updatedCollection);
                    const updatedCollections = collections.map(c => 
                      c.collectionId === settingsCollection.collectionId ? updatedCollection : c
                    );
                    setCollections(updatedCollections);
                    closeSettingsSheet();
                  } catch (error) {
                    console.error('Failed to toggle visibility:', error);
                    alert('Failed to update collection visibility');
                  }
                }}>
                <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>
                  {settingsCollection?.visibility === 'Public' ? 'Make Not Visible to Friends' : 'Make Visible to Friends'}
                </Text>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                style={sheetItemStyle.settingsItem}
                activeOpacity={0.1}
                onPress={() => {
                  closeSettingsSheet();
                  setIsShareSheetVisible(true);
                }}>
                  <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Share</Text>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                style={sheetItemStyle.settingsItem}
                activeOpacity={0.1}
                onPress={() => {
                  if (!settingsCollection?.collectionId) return;
                  closeSettingsSheet();
                  const setPublishingCollection = useAppStore.getState().setPublishingCollection;
                  setPublishingCollection(settingsCollection);
                  router.push('../collections/publishCollection');
                }}>
                  <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Publish</Text>
               </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                style={sheetItemStyle.settingsItem}
                activeOpacity={0.1}
                onPress={() => {
                  if (!settingsCollection) return;
                  closeSettingsSheet();
                  setDeleteDialogVisible(true);
                  setDeleteDialogCollection(settingsCollection);
                }}>
                <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>Delete</Text>
              </TouchableOpacity>
              <Divider />
            </>
          ) : (
            <>
              <TouchableOpacity
                style={sheetItemStyle.settingsItem}
                activeOpacity={0.1}
                onPress={() => {
                  if (!settingsCollection) return;
                  closeSettingsSheet();
                  setDeleteDialogVisible(true);
                  setDeleteDialogCollection(settingsCollection);
                }}>
                <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>Remove</Text>
              </TouchableOpacity>
              <Divider />
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
      </Portal>

      {/* Collections Settings Sheet */}
      <Portal>
        <BottomSheet
          ref={collectionsSettingsSheetRef}
          index={isCollectionsSettingsSheetOpen ? 0 : -1}
          snapPoints={collectionsSettingsSnapPoints}
          enablePanDownToClose
          enableOverDrag={false}
          android_keyboardInputMode="adjustResize"
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          onChange={handleCollectionsSettingsSheetChange}
          backgroundStyle={{ backgroundColor: theme.colors.surface }}
          handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
        >
        <BottomSheetView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Text style={{...styles.text, fontSize: 20, fontWeight: '600', marginBottom: 20, marginTop: 10, alignSelf: 'center'}}>Sort Collections By:</Text>
            <Divider />
            <TouchableOpacity
              style={sheetItemStyle.settingsItem}
              activeOpacity={0.1}
              onPress={async () => {
                const updatedUser = { ...user, collectionsSortBy: 0 };
                setUser(updatedUser);
                closeCollectionsSettingsSheet();
                updateCollectionsOrder();
                try {
                  await updateCollectionsSortBy(0, user.username);
                } catch (error) {
                  console.error('Failed to update collections sort by:', error);
                }
              }}>
              <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: activeCollectionsSortBy === 0 ? '700' : '500' }}>Custom Order</Text>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity
              style={sheetItemStyle.settingsItem}
              activeOpacity={0.1}
              onPress={async () => {
                const updatedUser = { ...user, collectionsSortBy: 1 };
                setUser(updatedUser);
                closeCollectionsSettingsSheet();
                updateCollectionsOrder();
                try {
                  await updateCollectionsSortBy(1, user.username);
                } catch (error) {
                  console.error('Failed to update collections sort by:', error);
                }
              }}>
              <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: activeCollectionsSortBy === 1 ? '700' : '500' }}>Newest Modified</Text>
            </TouchableOpacity>
            <View style={{ marginBottom: 0 }} />
            <Divider style={{ marginBottom: 0 }} />
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <TouchableOpacity
              style={{
                height: 50,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: theme.colors.surface2,
                borderRadius: 8,
                marginTop: 12,
              }}
              activeOpacity={0.1}
              onPress={() => {
                closeCollectionsSettingsSheet();
                router.push('../collections/reorderCollections');
              }}>
              <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Reorder Custom Order</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
      </Portal>
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={hideDialog}>
        <Dialog.Content>
          <Text style={{...styles.tinyText}}>Are you sure you want to {deleteDialogIsOwned ? 'delete' : 'remove'} the collection "{deleteDialogCollection?.title}"?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <View style={{ flexDirection: 'row', width: '100%' }}>
            <View style={{ width: '50%', paddingRight: 8 }}>
              <Button 
                title="Cancel" 
                onPress={() => hideDeleteDialog()} 
                variant="text"
                style={{ height: 30 }}
              />
            </View>
            <View style={{ width: '50%', paddingLeft: 8 }}>
              {isDeletingCollection ? (
                <View style={{ height: 30, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.colors.error} />
                </View>
              ) : (
                <Button 
                  title={deleteDialogIsOwned ? 'Delete' : 'Remove'} 
                  onPress={() => deleteCollectionHandle()} 
                  variant="text"
                  style={{ height: 30 }}
                  textStyle={{ color: theme.colors.error }}
                />
              )}
            </View>
          </View>
        </Dialog.Actions>
      </Dialog>
      </Portal>
      
      <ShareCollectionSheet
        visible={isShareSheetVisible}
        collection={settingsCollection}
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

      <ShareVerseSheet
        visible={versesToShare.length > 0}
        userVerses={versesToShare}
        onClose={() => setVersesToShare([])}
        onShareSuccess={(friendUsername) => {
          setSnackbarMessage(`Verse shared with ${friendUsername}!`);
          setSnackbarVisible(true);
        }}
        onShareError={() => {
          setSnackbarMessage('Failed to share verse');
          setSnackbarVisible(true);
        }}
      />

      {/* Collection Picker Modal for Verse of the Day Save */}
      <Portal>
        <Modal
          visible={showVodCollectionPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVodCollectionPicker(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={1}
              onPress={() => {
                setPickedVodCollection(undefined);
                setNewVodCollectionTitle('');
                setShowVodCollectionPicker(false);
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={{ backgroundColor: theme.colors.surface, borderRadius: 12, width: '90%', maxWidth: 400, maxHeight: '70%', padding: 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ 
                    fontSize: 20,
                    fontWeight: '600',
                    fontFamily: 'Inter',
                    color: theme.colors.onBackground,
                  }}>
                    Choose a Collection
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setPickedVodCollection(undefined);
                      setNewVodCollectionTitle('');
                      setShowVodCollectionPicker(false);
                    }}
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

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: theme.colors.onBackground, marginBottom: 8, fontFamily: 'Inter', fontWeight: '600' }}>
                New Collection Title
              </Text>
              <TextInput
                value={newVodCollectionTitle}
                onChangeText={handleVodInputChange}
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
            <ScrollView style={{ maxHeight: height * 0.35 }}>
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
                  <React.Fragment key="vod-collections-list">
                    <View key="favorites-section">
                      {favorites.map((collection, idx) => (
                        <TouchableOpacity
                          key={collection.collectionId ?? `fav-${collection.title}-${collection.authorUsername ?? ''}-${idx}`}
                          activeOpacity={0.1}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            marginBottom: 8,
                            backgroundColor: pickedVodCollection?.collectionId === collection.collectionId 
                              ? theme.colors.primary 
                              : 'transparent',
                            borderRadius: 8,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onPress={() => handleVodCollectionSelect(collection)}
                        >
                          <Text style={{
                            fontSize: 16,
                            color: pickedVodCollection?.collectionId === collection.collectionId 
                              ? '#fff' 
                              : theme.colors.onBackground,
                            fontFamily: 'Inter'
                          }}>
                            {collection.title}
                          </Text>
                          <Ionicons 
                            name="star" 
                            size={20} 
                            color={pickedVodCollection?.collectionId === collection.collectionId 
                              ? '#fff' 
                              : theme.colors.onBackground} 
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View key="nonfavorites-section">
                      {nonFavorites.map((collection, idx) => (
                        <TouchableOpacity
                          key={collection.collectionId ?? `nonfav-${collection.title}-${collection.authorUsername ?? ''}-${idx}`}
                          activeOpacity={0.1}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            marginBottom: 8,
                            backgroundColor: pickedVodCollection?.collectionId === collection.collectionId 
                              ? theme.colors.primary 
                              : 'transparent',
                            borderRadius: 8
                          }}
                          onPress={() => handleVodCollectionSelect(collection)}
                        >
                          <Text style={{
                            fontSize: 16,
                            color: pickedVodCollection?.collectionId === collection.collectionId 
                              ? '#fff' 
                              : theme.colors.onBackground,
                            fontFamily: 'Inter'
                          }}>
                            {collection.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </React.Fragment>
                );
              })()}
            </ScrollView>

                {newVodCollectionTitle.trim() ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: (!newVodCollectionTitle.trim() || isCreatingNewVodCollection) ? theme.colors.surface2 : theme.colors.primary,
                      paddingVertical: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 16,
                      opacity: (!newVodCollectionTitle.trim() || isCreatingNewVodCollection) ? 0.5 : 1,
                    }}
                    activeOpacity={0.7}
                    onPress={handleCreateNewVodCollection}
                    disabled={!newVodCollectionTitle.trim() || isCreatingNewVodCollection}
                  >
                    {isCreatingNewVodCollection ? (
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
                      backgroundColor: (!pickedVodCollection || isAddingVodToCollection) ? theme.colors.surface2 : theme.colors.primary,
                      paddingVertical: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 16,
                      opacity: (!pickedVodCollection || isAddingVodToCollection) ? 0.5 : 1,
                    }}
                    activeOpacity={0.7}
                    onPress={handleAddVodToCollection}
                    disabled={!pickedVodCollection || isAddingVodToCollection}
                  >
                    {isAddingVodToCollection ? (
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
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      {/* Search Dialog */}
      <Portal>
        <Modal
          visible={searchDialogVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setSearchDialogVisible(false);
            setSearchQuery('');
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={1}
              onPress={() => {
                setSearchDialogVisible(false);
                setSearchQuery('');
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={{ backgroundColor: theme.colors.surface, marginHorizontal: 20, borderRadius: 12, padding: 20, width: '90%', maxWidth: 400 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ color: theme.colors.onSurface, fontSize: 20, fontFamily: 'Inter', fontWeight: '600' }}>
                    Search Passages
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSearchDialogVisible(false);
                      setSearchQuery('');
                    }}
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
                <TextInput
                  placeholder="Search by reference"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: 8,
                    padding: 12,
                    color: theme.colors.onSurface,
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.outline,
                    marginBottom: 16,
                  }}
                  autoFocus
                  onSubmitEditing={() => {
                    if (searchQuery.trim()) {
                      setSearchDialogVisible(false);
                      router.push({
                        pathname: '../collections/searchPassages',
                        params: { query: searchQuery.trim() }
                      });
                      setSearchQuery('');
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (searchQuery.trim()) {
                      setSearchDialogVisible(false);
                      router.push({
                        pathname: '../collections/searchPassages',
                        params: { query: searchQuery.trim() }
                      });
                      setSearchQuery('');
                    }
                  }}
                  disabled={!searchQuery.trim()}
                  style={{
                    backgroundColor: searchQuery.trim() ? theme.colors.primary : theme.colors.surface2,
                    borderRadius: 8,
                    padding: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: searchQuery.trim() ? 1 : 0.5,
                  }}
                >
                  <Text style={{
                    color: searchQuery.trim() ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                    fontSize: 16,
                    fontWeight: '600',
                    fontFamily: 'Inter',
                  }}>
                    Search
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
      
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

      <PracticeModeModal
        visible={practiceModeModalVisible}
        onClose={() => {
          setPracticeModeModalVisible(false);
          setSelectedVodUserVerse(null);
        }}
        onSelectLearn={handleLearnMode}
      />

      {/* Notes Modal for Verse of the Day */}
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
                    {verseOfDay?.readableReference}
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

                <ScrollView 
                  contentContainerStyle={{ paddingBottom: 10 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {/* Public Notes Section */}
                  {user?.username && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text
                          style={{
                            fontFamily: 'Noto Serif bold',
                            fontSize: 20,
                            color: theme.colors.onBackground,
                          }}
                        >
                          Public Notes
                        </Text>
                      </View>
                      {loadingVodPublicNotes ? (
                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                      ) : vodPublicNotes.length === 0 ? (
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, fontStyle: 'italic' }}>
                          No public notes
                        </Text>
                      ) : (
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ paddingRight: 20 }}
                          snapToInterval={noteCardWidth + 13}
                          snapToAlignment="start"
                          decelerationRate="fast"
                          pagingEnabled={false}
                        >
                          {vodPublicNotes.map((note, noteIndex) => {
                            const handleLikeToggle = async () => {
                              if (!user?.username) return;
                              try {
                                const result = note.userLiked
                                  ? await unlikeNote(note.id, user.username)
                                  : await likeNote(note.id, user.username);
                                
                                setVodPublicNotes(prev => 
                                  prev.map(n => 
                                    n.id === note.id 
                                      ? { ...n, likeCount: result.likeCount, userLiked: result.liked }
                                      : n
                                  )
                                );
                              } catch (error) {
                                console.error('Error toggling like:', error);
                              }
                            };

                            return (
                              <View key={note.id} style={{ flexDirection: 'row' }}>
                                <View style={{ width: noteCardWidth, position: 'relative' }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ color: theme.colors.onBackground, fontSize: 12, fontWeight: '600' }}>
                                      {note.username}
                                    </Text>
                                    <TouchableOpacity
                                      onPress={handleLikeToggle}
                                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                      disabled={!user?.username}
                                    >
                                      <Ionicons 
                                        name={note.userLiked ? "heart" : "heart-outline"} 
                                        size={18} 
                                        color={note.userLiked ? theme.colors.error : theme.colors.onSurfaceVariant} 
                                      />
                                      {note.likeCount !== undefined && note.likeCount > 0 && (
                                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                                          {note.likeCount}
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                  {note.createdDate && (
                                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginBottom: 4 }}>
                                      {formatISODate(new Date(note.createdDate))}
                                    </Text>
                                  )}
                                  <Text style={{ color: theme.colors.onBackground, fontSize: 14, lineHeight: 20 }}>
                                    {note.text}
                                  </Text>
                                  {note.username === user?.username && (
                                    <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 }}>
                                      <TouchableOpacity
                                        onPress={() => handleEditNote(note)}
                                        disabled={isDeletingNote || isUpdatingNote}
                                        style={{ padding: 4 }}
                                      >
                                        <Ionicons name="pencil" size={16} color={theme.colors.onBackground} />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => handleDeleteVerseNote(note.id)}
                                        disabled={isDeletingNote || isUpdatingNote}
                                        style={{ padding: 4 }}
                                      >
                                        {isDeletingNote ? (
                                          <ActivityIndicator size="small" color={theme.colors.error} />
                                        ) : (
                                          <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                        )}
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                                {noteIndex < vodPublicNotes.length - 1 && (
                                  <View style={{ width: 1, backgroundColor: theme.colors.outline, marginHorizontal: 6 }} />
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* Private Notes Section */}
                  {user?.username && (
                    <View style={{ marginTop: 20, marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text
                          style={{
                            fontFamily: 'Noto Serif bold',
                            fontSize: 20,
                            color: theme.colors.onBackground,
                          }}
                        >
                          Private Notes
                        </Text>
                      </View>
                      {loadingVodNotes ? (
                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                      ) : vodPrivateNotes.length === 0 ? (
                        <Text style={{ color: theme.colors.onBackground, fontSize: 14, fontStyle: 'italic' }}>
                          No private notes
                        </Text>
                      ) : (
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ paddingRight: 20 }}
                          snapToInterval={noteCardWidth + 13}
                          snapToAlignment="start"
                          decelerationRate="fast"
                          pagingEnabled={false}
                        >
                          {vodPrivateNotes.map((note, index) => (
                            <View key={note.id} style={{ flexDirection: 'row' }}>
                              <View style={{ width: noteCardWidth, position: 'relative' }}>
                                <Text style={{ color: theme.colors.onBackground, fontSize: 14, lineHeight: 20 }}>
                                  {note.text}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                  {note.createdDate && (
                                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
                                      {formatISODate(new Date(note.createdDate))}
                                    </Text>
                                  )}
                                </View>
                                {note.username === user?.username && (
                                  <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                      onPress={() => handleEditNote(note)}
                                      disabled={isDeletingNote || isUpdatingNote}
                                      style={{ padding: 4 }}
                                    >
                                      <Ionicons name="pencil" size={16} color={theme.colors.onBackground} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => handleDeleteVerseNote(note.id)}
                                      disabled={isDeletingNote || isUpdatingNote}
                                      style={{ padding: 4 }}
                                    >
                                      {isDeletingNote ? (
                                        <ActivityIndicator size="small" color={theme.colors.error} />
                                      ) : (
                                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                              {index < vodPrivateNotes.length - 1 && (
                                <View style={{ width: 1, backgroundColor: theme.colors.outline, marginHorizontal: 6 }} />
                              )}
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* Add Note Button */}
                  {user?.username && (
                    <TouchableOpacity
                      style={{...styles.button_outlined, marginTop: 20, alignSelf: 'center'}}
                      activeOpacity={0.7}
                      onPress={() => {
                        setNewNoteText('');
                        setEditingNote(null);
                        setEditNoteText('');
                        setIsPublicNote(false);
                        setAddNoteDialogVisible(true);
                      }}
                    >
                      <Ionicons name="add" size={26} color={theme.colors.onBackground} />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      {/* Add/Edit Note Dialog for Verse of the Day */}
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

                {!editingNote && (
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                    <TouchableOpacity
                      onPress={() => setIsPublicNote(false)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: !isPublicNote ? theme.colors.primary : theme.colors.outline,
                        backgroundColor: !isPublicNote ? theme.colors.primary : 'transparent',
                        marginRight: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{
                        color: !isPublicNote ? '#fff' : theme.colors.onBackground,
                        fontSize: 14,
                        fontWeight: '600',
                        fontFamily: 'Inter'
                      }}>
                        Private
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsPublicNote(true)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: isPublicNote ? theme.colors.primary : theme.colors.outline,
                        backgroundColor: isPublicNote ? theme.colors.primary : 'transparent',
                        marginLeft: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{
                        color: isPublicNote ? '#fff' : theme.colors.onBackground,
                        fontSize: 14,
                        fontWeight: '600',
                        fontFamily: 'Inter'
                      }}>
                        Public
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

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
                    <Ionicons name="checkmark" size={26} color={theme.colors.onBackground} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

    </View>
    </>
  );
}
