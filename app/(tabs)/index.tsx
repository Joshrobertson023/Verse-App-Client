import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator, Banner, Button, Dialog, Divider, Portal, Snackbar } from 'react-native-paper';
import Animated, { interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import CollectionItem from '../components/collectionItem';
import ShareCollectionSheet from '../components/shareCollectionSheet';
import ShareVerseSheet from '../components/shareVerseSheet';
import { getUTCTimestamp } from '../dateUtils';
import { addUserVersesToNewCollection, createCollectionDB, deleteCollection, getMostRecentCollectionId, getOverdueVerses, getRecentPractice, getSiteBanner, getUpcomingVerseOfDay, getUserCollections, getVerseSearchResult, refreshUser, updateCollectionDB, updateCollectionsOrder as updateCollectionsOrderDB, updateCollectionsSortBy } from '../db';
import { Collection, SearchData, useAppStore, UserVerse, Verse, VerseOfDay as VodType } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

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

const queuedVodLoads = new Set<string>();

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
  const [settingsCollection, setSettingsCollection] = useState<Collection | undefined>(undefined);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const [isCreatingCopy, setIsCreatingCopy] = useState(false);
  const [isCollectionsSettingsSheetOpen, setIsCollectionsSettingsSheetOpen] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteDialogCollection, setDeleteDialogCollection] = useState<Collection | undefined>(undefined);
  const [isShareSheetVisible, setIsShareSheetVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const deleteCollectionStore = useAppStore((state) => state.removeCollection);
  const [localSortBy, setLocalSortBy] = useState(0);
  const [orderedCollections, setOrderedCollections] = useState<Collection[]>(collections);
  const [isSettingsCollectionPublished, setIsSettingsCollectionPublished] = useState<boolean | null>(null);
  const [shouldReloadPracticeList, setShouldReloadPracticeList] = useState(false);
  const [isBannerLoading, setIsBannerLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

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

  // Verse of the Day state
  const [currentVod, setCurrentVod] = useState<VodType | null>(null);
  const [vodTexts, setVodTexts] = useState<Record<string, Verse[]>>({});
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = useMemo(() => Math.min(screenWidth - 50, 580), [screenWidth]);

  // Collection picker state for Verse of the Day Save functionality
  const [showVodCollectionPicker, setShowVodCollectionPicker] = useState(false);
  const [selectedVodVerse, setSelectedVodVerse] = useState<Verse | null>(null);
  const [pickedVodCollection, setPickedVodCollection] = useState<Collection | undefined>(undefined);
  const [isAddingVodToCollection, setIsAddingVodToCollection] = useState(false);
  const [verseToShare, setVerseToShare] = useState<Verse | null>(null);
  const verseSaveAdjustments = useAppStore((state) => state.verseSaveAdjustments);
  const incrementVerseSaveAdjustment = useAppStore((state) => state.incrementVerseSaveAdjustment);

  // Recent Practice, Overdue, and Activity state
  const [recentPractice, setRecentPractice] = useState<UserVerse[]>([]);
  const [overdueVerses, setOverdueVerses] = useState<UserVerse[]>([]);
  const [recentPracticeLoaded, setRecentPracticeLoaded] = useState(false);
  const [overdueVersesLoaded, setOverdueVersesLoaded] = useState(false);

  const isSameUTCDate = (a: Date, b: Date) => {
    return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
  };

  const currentVodVerses = currentVod ? vodTexts[currentVod.readableReference] : undefined;
  const currentVodDate = currentVod ? new Date(currentVod.versedDate) : null;
  const currentVodIsToday = currentVodDate ? isSameUTCDate(currentVodDate, new Date()) : false;
  const currentVodText = currentVodVerses && currentVodVerses.length > 0
    ? currentVodVerses.map(v => v.text).join(' ')
    : '';
  const currentVodSavedCount = currentVodVerses && currentVodVerses.length > 0
    ? currentVodVerses[0].users_Saved_Verse ?? 0
    : 0;
  const currentVodMemorizedCount = currentVodVerses && currentVodVerses.length > 0
    ? currentVodVerses[0].users_Memorized ?? 0
    : 0;
  const displayedVodSavedCount = currentVodSavedCount + (currentVod?.readableReference ? (verseSaveAdjustments[currentVod.readableReference] ?? 0) : 0);

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

  useEffect(() => {
    (async () => {
      try {
        const data: VodType[] = await getUpcomingVerseOfDay();
        const normalized = Array.isArray(data) ? [...data] : [];
        normalized.sort((a, b) => {
          const aTime = new Date(a.versedDate).getTime();
          const bTime = new Date(b.versedDate).getTime();
          return bTime - aTime;
        });
        const today = new Date();
        const targetForToday = normalized.find(v => {
          const d = new Date(v.versedDate);
          return isSameUTCDate(d, today);
        });
        const fallback = normalized.length > 0 ? normalized[0] : null;
        const targetVod = targetForToday || fallback || null;

        setCurrentVod(targetVod);

        if (targetVod?.readableReference) {
          loadTextForReference(targetVod.readableReference);
        }
      } catch (e) {
        console.error('Failed to load verse of day list', e);
        setCurrentVod(null);
      }
    })();
  }, []);

  // Fetch Recent Practice, Overdue, and Activity separately
  useFocusEffect(
    useCallback(() => {
      if (user.username === 'Default User') return;
      
      // Load Recent Practice
      (async () => {
        try {
          const recent = await getRecentPractice(user.username);
          setRecentPractice(recent || []);
          setRecentPracticeLoaded(true);
        } catch (e) {
          console.error('Failed to load recent practice', e);
          setRecentPracticeLoaded(false);
        }
      })();

      // Load Overdue Verses
      (async () => {
        try {
          const overdue = await getOverdueVerses(user.username);
          setOverdueVerses(overdue || []);
          setOverdueVersesLoaded(true);
        } catch (e) {
          console.error('Failed to load overdue verses', e);
          setOverdueVersesLoaded(false);
        }
      })();

    }, [user.username])
  );

  const loadTextForReference = async (readableReference: string | undefined | null) => {
    if (!readableReference) return;

    if (vodTexts[readableReference] && vodTexts[readableReference]!.length > 0) {
      return;
    }

    if (queuedVodLoads.has(readableReference)) {
      return;
    }

    queuedVodLoads.add(readableReference);

    try {
      const data: SearchData = await getVerseSearchResult(readableReference);
      setVodTexts(prev => ({ ...prev, [readableReference]: data.verses || [] }));
    } catch (e) {
      console.error('Failed to fetch verse text', e);
    } finally {
      queuedVodLoads.delete(readableReference);
    }
  };

  const handleSaveVodVerse = (readableReference: string) => {
    const verses = vodTexts[readableReference];
    if (!verses || verses.length === 0) {
      setSnackbarMessage('Verse not loaded yet. Please wait...');
      setSnackbarVisible(true);
      return;
    }
    // Use the first verse from the search results
    const verse = verses[0];
    // Ensure verse_reference is set
    const formattedVerse: Verse = {
      ...verse,
      verse_reference: verse.verse_reference || readableReference,
    };
    setSelectedVodVerse(formattedVerse);
    setPickedVodCollection(undefined);
    setShowVodCollectionPicker(true);
  };

  const handleAddVodToCollection = async () => {
    if (!pickedVodCollection || !selectedVodVerse || !user.username || isAddingVodToCollection) return;

    const readableReference = selectedVodVerse.verse_reference || '';
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

    setIsAddingVodToCollection(true);

    const userVerse: UserVerse = {
      username: user.username,
      readableReference: readableReference,
      verses: [selectedVodVerse]
    };

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

  const handlePracticeVodVerse = (readableReference: string) => {
    const verses = vodTexts[readableReference];
    if (!verses || verses.length === 0) {
      setSnackbarMessage('Verse not loaded yet. Please wait...');
      setSnackbarVisible(true);
      return;
    }
    
    // Create a UserVerse object for practice session
    const userVerse: UserVerse = {
      username: user.username,
      readableReference: readableReference,
      verses: verses
    };
    
    // Set the editing user verse and navigate to practice session
    const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
    setEditingUserVerse(userVerse);
    router.push('/practiceSession');
  };

  const handleShareVodVerse = (readableReference: string) => {
    const verses = vodTexts[readableReference];
    if (!verses || verses.length === 0) {
      setSnackbarMessage('Verse not loaded yet. Please wait...');
      setSnackbarVisible(true);
      return;
    }
    
    // Use the first verse from the search results
    const verse = verses[0];
    // Ensure verse_reference is set
    const formattedVerse: Verse = {
      ...verse,
      verse_reference: verse.verse_reference || readableReference,
    };
    setVerseToShare(formattedVerse);
  };

  const hideDialog = () => setVisible(false);
  const hideDeleteDialog = () => setDeleteDialogVisible(false);

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
    if (!collectionId) return;
    
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
  }

  const handleCreateCopy = async (collectionToCopy: Collection) => {
    if (collections.length >= 40) {
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





  // ***************************************************
  //                    Animations   
  // ***************************************************


  const offset = .1;
  const settingsSheetHeight = height * (.5 + offset);
  const settingsClosedPosition = height;
  const settingsOpenPosition = height - settingsSheetHeight + (height * offset);

  const collectionSettingsSheetHeight = height * (.45 + offset);
  const collectionsSettingsClosedPosition = height;
  const collectionsSettingsOpenPosition = height - collectionSettingsSheetHeight + (height * offset);

  const settingsTranslateY = useSharedValue(settingsClosedPosition);
  const settingsStartY = useSharedValue(0);

  const collectionsSettingsTranslateY = useSharedValue(collectionsSettingsClosedPosition);
  const collectionsSettingsStartY = useSharedValue(0);

  const openCollectionsSettingsSheet = () => {
    setIsCollectionsSettingsSheetOpen(true);
    collectionsSettingsTranslateY.value = withSpring(collectionsSettingsOpenPosition, {
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,
    });
  }

  const closeCollectionsSettingsSheet = (onCloseComplete?: () => void) => {
    collectionsSettingsTranslateY.value = withSpring(collectionsSettingsClosedPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,
    }, (isFinished) => {
      'worklet';
      if (isFinished) {
        if (onCloseComplete) {
          runOnJS(onCloseComplete)();
        }
        runOnJS(setIsCollectionsSettingsSheetOpen)(false);
      }
    });
  }

  const collectionsSettingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: collectionsSettingsTranslateY.value }],
  }));

  const collectionsBackdropAnimatedStyle = useAnimatedStyle(() => {
    const sheetProgress =
      (collectionsSettingsClosedPosition - collectionsSettingsTranslateY.value) / collectionSettingsSheetHeight;

    const opacity = Math.min(1, Math.max(0, sheetProgress)) * 0.5;

    return {
      opacity,
      pointerEvents: opacity > 0.001 ? 'auto' : 'none',
    };
  });

  const collectionsSettingsPanGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      collectionsSettingsStartY.value = collectionsSettingsTranslateY.value;
    })
    .onUpdate(e => {
      'worklet';
      const newPosition = collectionsSettingsStartY.value + e.translationY;
      collectionsSettingsTranslateY.value = Math.max(collectionsSettingsOpenPosition, newPosition);
    })
    .onEnd(e => {
      'worklet';
      const SWIPE_DISTANCE_THRESHOLD = 150;
      const VELOCITY_THRESHOLD = 500;

      const isDraggedDownFar = collectionsSettingsTranslateY.value > collectionsSettingsOpenPosition + SWIPE_DISTANCE_THRESHOLD;
      const isFlickedDown = e.velocityY > VELOCITY_THRESHOLD;

      if (isDraggedDownFar || isFlickedDown) {
        collectionsSettingsTranslateY.value = withSpring(collectionsSettingsClosedPosition, {       
          stiffness: 900,
          damping: 110,
          mass: 2,
          overshootClamping: true,
          energyThreshold: 6e-9,
        }, (isFinished) => {
          'worklet';
          if (isFinished) {
            runOnJS(closeCollectionsSettingsSheet)();
          }
        });
      } else {
        collectionsSettingsTranslateY.value = withSpring(collectionsSettingsOpenPosition, {       
          stiffness: 900,
          damping: 110,
          mass: 2,
          overshootClamping: true,
          energyThreshold: 6e-9,
        });
      }
    })

  const openSettingsSheet = () => {
    setIsSettingsSheetOpen(true);
    settingsTranslateY.value = withSpring(settingsOpenPosition, {
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
  }

  const closeSettingsSheet = (onCloseComplete?: () => void) => {
    settingsTranslateY.value = withSpring(settingsClosedPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,}, (isFinished) => {
      'worklet';
      if (isFinished) {
        if (onCloseComplete) {
          runOnJS(onCloseComplete)();
        }
        runOnJS(setIsSettingsSheetOpen)(false);
      }
    });
  }

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
    .onStart(() => {
      'worklet';
      settingsStartY.value = settingsTranslateY.value;
    })
    .onUpdate(e => {
      'worklet';
      const newPosition = settingsStartY.value + e.translationY;
      settingsTranslateY.value = Math.max(settingsOpenPosition, newPosition);
    })
    .onEnd(e => {
      'worklet';
      const SWIPE_DISTANCE_THRESHOLD = 150;
      const VELOCITY_THRESHOLD = 500;

      const isDraggedDownFar = settingsTranslateY.value > settingsOpenPosition + SWIPE_DISTANCE_THRESHOLD;
      const isFlickedDown = e.velocityY > VELOCITY_THRESHOLD;

      if (isDraggedDownFar || isFlickedDown) {
        settingsTranslateY.value = withSpring(settingsClosedPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,}, (isFinished) => {
          'worklet';
          if (isFinished) {
            runOnJS(closeSettingsSheet)();
          }
        });
      } else {
        settingsTranslateY.value = withSpring(settingsOpenPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
      }
    })


  // End Animations







  const handleMenuPress = (collection: Collection) => {
    if (isSettingsSheetOpen) {
      setSettingsCollection(collection);
      closeSettingsSheet(() => {
        openSettingsSheet();
      });
    } else {
      setSettingsCollection(collection);
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
      <Button
        style={{
          backgroundColor: theme.colors.background
        }}
        onPress={() => router.push('../collections/addnew')}
      >
        <Ionicons name="add" size={32} color={theme.colors.onBackground} />
      </Button>
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
            <Text style={{ ...styles.tinyText, color: theme.colors.onSurface, fontFamily: 'Inter', marginRight: 12, height: '100% ' }}>
              {siteBanner.message}
            </Text>
          </Banner>
        ) : null}

        {/* Verse Of The Day */}
        <View style={{ width: '100%', marginBottom: 20 }}>
          <View style={{ paddingHorizontal: 2, marginBottom: 4, marginTop: -10 }}>
            <Text style={{ ...styles.tinyText, margin: 0, marginLeft: 15, fontSize: 13, opacity: 0.8 }}>Verse Of The Day</Text>
            </View>
          <View style={{ alignItems: 'center', width: '100%' }}>
            {currentVod ? (
                <View style={{ width: '100%' }}>
                <View style={{ backgroundColor: theme.colors.surface, alignItems: 'stretch', justifyContent: 'space-between', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: .15, shadowRadius: 6 }}>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontFamily: 'Noto Serif bold', fontSize: 22, color: theme.colors.onBackground }}>{currentVod.readableReference}</Text>
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
                    <TouchableOpacity activeOpacity={0.1} onPress={() => handleSaveVodVerse(currentVod.readableReference)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="bookmark-outline" size={18} color={theme.colors.onBackground} />
                          <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Save</Text>
                        </View>
                      </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.1} onPress={() => handlePracticeVodVerse(currentVod.readableReference)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="extension-puzzle-outline" size={18} color={theme.colors.onBackground} />
                          <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Practice</Text>
                        </View>
                      </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.1} onPress={() => handleShareVodVerse(currentVod.readableReference)}>
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

        {/* Recent Practice Section */}
        {recentPracticeLoaded && (
          <View style={{ width: '100%', marginBottom: 30, marginTop: 5, borderRadius: 20 }}>
            <Text style={{ ...styles.text, fontFamily: 'Inter bold', marginBottom: 5, backgroundColor: theme.colors.background, zIndex: 9999 }}>Recent Practice</Text>
            {recentPractice.length > 0 ? (
              <View style={{ flexDirection: 'row', position: 'relative' }}>
                <View style={{ flex: 1, marginLeft: 20 }}>
                  {recentPractice.map((uv, index) => (
                    <View key={uv.id || index} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}>
                      <View style={{
                        position: 'absolute',
                        left: -10,
                        top: 0,
                        width: 4,
                        height: 34,
                        borderRadius: 9999,
                        backgroundColor: theme.colors.onBackground
                      }}/>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, height: 30, marginTop: 0 }}>
                        <Text style={{ fontFamily: 'Inter', fontSize: 16, color: theme.colors.onBackground, marginRight: 12 }}>
                          {uv.readableReference}
                        </Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 14, color: theme.colors.onSurfaceVariant }}>
                          {uv.progressPercent === 100 ? '100%' : `${Math.round(uv.progressPercent || 0)}%`}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        activeOpacity={0.1}
                        onPress={async () => {
                          try {
                            // Populate verses if not already populated
                            let verseToPractice = uv;
                            if (!verseToPractice.verses || verseToPractice.verses.length === 0) {
                              const searchData = await getVerseSearchResult(uv.readableReference);
                              verseToPractice = { ...uv, verses: searchData.verses || [] };
                            }
                            const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
                            setEditingUserVerse(verseToPractice);
                            router.push('/practiceSession');
                          } catch (e) {
                            console.error('Failed to load verse for practice', e);
                            setSnackbarMessage('Failed to load verse');
                            setSnackbarVisible(true);
                          }
                        }}
                      >
                        <Text style={{ ...styles.tinyText, fontSize: 12, textDecorationLine: 'underline', opacity: 0.8}}>
                          Learn again
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', position: 'relative', marginTop: 5 }}>
                {/* L shape for empty state */}
                <View style={{ marginLeft: 20, alignItems: 'flex-start' }}>
                  
                      <View style={{
                        position: 'absolute',
                        left: -10,
                        top: 0,
                        width: 4,
                        height: 30,
                        borderRadius: 9999,
                        backgroundColor: theme.colors.onBackground
                      }}/>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-start', marginLeft: 10, marginTop: 5 }}>
                  <Text style={{ 
                    fontFamily: 'Inter', 
                    fontSize: 14, 
                    color: theme.colors.onBackground,
                  }}>
                    No passages practiced
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Overdue Section */}
        {overdueVersesLoaded && (
          <View style={{ width: '100%', marginBottom: 24, borderRadius: 20 }}>
            <Text style={{ ...styles.text, fontFamily: 'Inter bold', marginBottom: 12 }}>Overdue</Text>
            {overdueVerses.length > 0 ? (
              <View style={{ flexDirection: 'row', position: 'relative' }}>
                <View style={{ flex: 1, marginLeft: 30 }}>
                  {overdueVerses.map((uv, index) => {
                    const lastPracticed = uv.lastPracticed ? new Date(uv.lastPracticed) : null;
                    const now = new Date();
                    const diffMs = lastPracticed ? now.getTime() - lastPracticed.getTime() : 0;
                    const diffHours = diffMs ? Math.floor(diffMs / (1000 * 60 * 60)) : 0;
                    const diffDays = diffMs ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
                    const timeAgo = diffDays > 0 ? `${diffDays}d ago` : `${diffHours}hr ago`;
                    
                    return (
                    <View key={uv.id || index} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}>
                      <View style={{
                        position: 'absolute',
                        left: -10,
                        top: 0,
                        width: 4,
                        height: 30,
                        borderRadius: 9999,
                        backgroundColor: theme.colors.onBackground
                      }}/>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, height: 30 }}>
                          <Text style={{ color: '#ff4444', fontSize: 16, marginRight: 8 }}>!</Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 16, color: theme.colors.onBackground, marginRight: 12 }}>
                            {uv.readableReference}
                          </Text>
                          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                            {timeAgo}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          activeOpacity={0.1}
                          onPress={async () => {
                            try {
                              // Populate verses if not already populated
                              let verseToPractice = uv;
                              if (!verseToPractice.verses || verseToPractice.verses.length === 0) {
                                const searchData = await getVerseSearchResult(uv.readableReference);
                                verseToPractice = { ...uv, verses: searchData.verses || [] };
                              }
                              const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
                              setEditingUserVerse(verseToPractice);
                              router.push('/practiceSession');
                            } catch (e) {
                              console.error('Failed to load verse for practice', e);
                              setSnackbarMessage('Failed to load verse');
                              setSnackbarVisible(true);
                            }
                          }}
                        >
                          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: theme.colors.primary, textDecorationLine: 'underline' }}>
                            Practice &gt;
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', position: 'relative' }}>
                {/* L shape for empty state */}
                <View style={{ marginLeft: 20, alignItems: 'flex-start' }}>
                  
                      <View style={{
                        position: 'absolute',
                        left: -10,
                        top: 0,
                        width: 4,
                        height: 30,
                        borderRadius: 9999,
                        backgroundColor: theme.colors.onBackground
                      }}/>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-start', marginLeft: 10, marginTop: 5 }}>
                  <Text style={{ 
                    fontFamily: 'Inter', 
                    fontSize: 14, 
                    color: theme.colors.onBackground,
                  }}>
                    No passages overdue
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}


        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: -10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20 }}>
            <TouchableOpacity
              activeOpacity={0.1}
              onPress={() => router.push('../collections/myPublished')}
              accessibilityRole="button"
              accessibilityLabel="Open my published collections"
            >
              <Ionicons name="globe" size={26} color={theme.colors.onBackground} />
            </TouchableOpacity>
          </View>
            <Text style={{ ...styles.subheading, marginBottom: 0 }}>My Verses</Text>
          <TouchableOpacity activeOpacity={0.1} onPress={() => openCollectionsSettingsSheet()}>
            <Ionicons name={"settings"} size={24} color={theme.colors.onBackground}  />
          </TouchableOpacity>
        </View>
        <View style={styles.collectionsContainer}>

          {orderedCollections.map((collection) => (
            <CollectionItem key={collection.collectionId} collection={collection} onMenuPress={handleMenuPress} />
          ))}

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

      <Portal>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
            },
            backdropAnimatedStyle
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.5}
            onPress={() => closeSettingsSheet()}
          />
        </Animated.View>

        <Animated.View style={[{
          position: 'absolute',
          left: 0,
          right: 0,
          height: settingsSheetHeight,
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingTop: 20,
          paddingBottom: 80,
          zIndex: 9999,
          boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)',
        }, settingsAnimatedStyle]}>
          <GestureDetector gesture={settingsPanGesture}>
            <View style={{ padding: 20, marginTop: -20, alignItems: 'center' }}>
              <View style={{ width: 50, height: 4, borderRadius: 2, backgroundColor: theme.colors.onBackground }} />
            </View>
          </GestureDetector>

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
                  {settingsCollection?.visibility === 'Public' ? 'Make Private' : 'Make Public'}
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
                  const setEditingCollection = useAppStore.getState().setEditingCollection;
                  setEditingCollection(settingsCollection);
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
        </Animated.View>
      </Portal>

      <Portal>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
            },
            collectionsBackdropAnimatedStyle
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.5}
            onPress={() => closeCollectionsSettingsSheet()}
          />
        </Animated.View>

        <Animated.View style={[{
          position: 'absolute',
          left: 0,
          right: 0,
          height: collectionSettingsSheetHeight,
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingTop: 20,
          paddingBottom: 80,
          zIndex: 9999,
          boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)',
        }, collectionsSettingsAnimatedStyle]}>
          <GestureDetector gesture={collectionsSettingsPanGesture}>
            <View style={{ padding: 20, marginTop: -20, alignItems: 'center' }}>
              <View style={{ width: 50, height: 4, borderRadius: 2, backgroundColor: theme.colors.onBackground }} />
            </View>
          </GestureDetector>

          <Text style={{...styles.text, fontSize: 20, fontWeight: '600', marginBottom: 20, marginTop: 10, alignSelf: 'center'}}>Sort Collections By:</Text>
          <Divider />
                <TouchableOpacity
            activeOpacity={0.1}
            onPress={() => {
              closeCollectionsSettingsSheet();
              router.push('../collections/reorderCollections');
            }}>
            <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Custom Order (Reorder)</Text>
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
            <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Newest Modified</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity
            style={sheetItemStyle.settingsItem}
            activeOpacity={0.1}
            onPress={async () => {
              const updatedUser = { ...user, collectionsSortBy: 2 };
              setUser(updatedUser);
              closeCollectionsSettingsSheet();
              updateCollectionsOrder();
              try {
                await updateCollectionsSortBy(2, user.username);
              } catch (error) {
                console.error('Failed to update collections sort by:', error);
              }
            }}>
            <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Percent Memorized</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity
            style={sheetItemStyle.settingsItem}
            activeOpacity={0.1}
            onPress={async () => {
              const updatedUser = { ...user, collectionsSortBy: 3 };
              setUser(updatedUser);
              closeCollectionsSettingsSheet();
              updateCollectionsOrder();
              try {
                await updateCollectionsSortBy(3, user.username);
              } catch (error) {
                console.error('Failed to update collections sort by:', error);
              }
            }}>
            <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Most Overdue</Text>
          </TouchableOpacity>
        </Animated.View>
      </Portal>
      <Portal>
      <Dialog visible={deleteDialogVisible} onDismiss={hideDialog}>
        <Dialog.Content>
          <Text style={{...styles.tinyText}}>Are you sure you want to {deleteDialogIsOwned ? 'delete' : 'remove'} the collection "{deleteDialogCollection?.title}"?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <TouchableOpacity style={{...styles.button_text, width: '50%', height: 30}} activeOpacity={0.1} onPress={() => hideDeleteDialog()}>
            <Text style={{...styles.buttonText_outlined}}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{...styles.button_text, width: '50%', height: 30}} activeOpacity={0.1} onPress={() => deleteCollectionHandle()}>
            <Text style={{...styles.buttonText_outlined, color: theme.colors.error}}>{deleteDialogIsOwned ? 'Delete' : 'Remove'}</Text>
          </TouchableOpacity>
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

      {/* Collection Picker Modal for Verse of the Day Save */}
      <Modal
        visible={showVodCollectionPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVodCollectionPicker(false)}
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
                        onPress={() => setPickedVodCollection(collection)}
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
                    {nonFavorites.map((collection) => (
                      <TouchableOpacity
                        key={collection.collectionId}
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
                        onPress={() => setPickedVodCollection(collection)}
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
                  setPickedVodCollection(undefined);
                  setShowVodCollectionPicker(false);
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
                  opacity: (!pickedVodCollection || isAddingVodToCollection) ? 0.5 : 1
                }}
                activeOpacity={0.1}
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
        <Text style={{ color: theme.colors.onSurface, fontFamily: 'Inter' }}>
          {snackbarMessage}
        </Text>
      </Snackbar>

      <ShareVerseSheet
        visible={!!verseToShare}
        verseReference={verseToShare?.verse_reference || null}
        onClose={() => setVerseToShare(null)}
        onShareSuccess={(friend) => { 
          setVerseToShare(null); 
          setSnackbarMessage(`Verse shared with ${friend}`); 
          setSnackbarVisible(true); 
        }}
        onShareError={() => { 
          setSnackbarMessage('Failed to share verse'); 
          setSnackbarVisible(true); 
        }}
      />
    </View>
    </>
  );
}
