import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator, Button, Dialog, Divider, Portal, Snackbar } from 'react-native-paper';
import Animated, { interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import CollectionItem from '../components/collectionItem';
import PublishDialog from '../components/publishDialog';
import ShareCollectionSheet from '../components/shareCollectionSheet';
import { addUserVersesToNewCollection, createCollectionDB, deleteCollection, getMostRecentCollectionId, getPublishedInfo, getUserCollections, publishCollection, refreshUser, unpublishCollection, updateCollectionDB, updateCollectionsOrder as updateCollectionsOrderDB, updateCollectionsSortBy } from '../db';
import { Collection, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { getUTCTimestamp } from '../dateUtils';

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

export default function Index() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);
  const homePageStats = useAppStore((state) => state.homePageStats);
  const setCollections = useAppStore((state) => state.setCollections);
  const setUser = useAppStore((state) => state.setUser);
  const [settingsCollection, setSettingsCollection] = useState<Collection | undefined>(undefined);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const [isCreatingCopy, setIsCreatingCopy] = useState(false);
  const [isCollectionsSettingsSheetOpen, setIsCollectionsSettingsSheetOpen] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteDialogCollection, setDeleteDialogCollection] = useState<Collection | undefined>(undefined);
  const [isShareSheetVisible, setIsShareSheetVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const deleteCollectionStore = useAppStore((state) => state.removeCollection);
  const [localSortBy, setLocalSortBy] = useState(0);
  const [orderedCollections, setOrderedCollections] = useState<Collection[]>(collections);
  const [isSettingsCollectionPublished, setIsSettingsCollectionPublished] = useState<boolean | null>(null);
  const [shouldReloadPracticeList, setShouldReloadPracticeList] = useState(false);

  const [visible, setVisible] = React.useState(false);

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
    setIsCreatingCopy(true);
    try {
      const duplicateCollection: Collection = {
        ...collectionToCopy,
        title: `${collectionToCopy.title} (Copy)`,
        collectionId: undefined,
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
    // Fetch published status
    if (collection.collectionId) {
      getPublishedInfo(collection.collectionId)
        .then(info => setIsSettingsCollectionPublished(!!info))
        .catch(() => setIsSettingsCollectionPublished(false));
    } else {
      setIsSettingsCollectionPublished(false);
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
        <Text style={{ ...styles.subheading }}>My Verses</Text>
        <TouchableOpacity style={{alignSelf: 'flex-end', position: 'relative', top: -28, marginBottom: -15}} activeOpacity={0.1} onPress={() => openCollectionsSettingsSheet()}>
          <Ionicons name={"settings"} size={24} color={theme.colors.onBackground}  />
        </TouchableOpacity>
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
            onPress={async () => {
              if (!settingsCollection?.collectionId) return;
              if (isSettingsCollectionPublished) {
                try {
                  await unpublishCollection(settingsCollection.collectionId);
                  setIsSettingsCollectionPublished(false);
                  setSnackbarMessage('Collection unpublished');
                  setSnackbarVisible(true);
                } catch (e) {
                  console.error('Failed to unpublish collection', e);
                  setSnackbarMessage('Failed to unpublish collection');
                  setSnackbarVisible(true);
                } finally {
                  closeSettingsSheet();
                }
              } else {
                closeSettingsSheet();
                setShowPublish(true);
              }
            }}>
              <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>{isSettingsCollectionPublished ? 'Unpublish' : 'Publish'}</Text>
           </TouchableOpacity>
          <Divider />
          <TouchableOpacity
            style={sheetItemStyle.settingsItem}
            activeOpacity={0.1}
            onPress={() => {
              closeSettingsSheet();
              setDeleteDialogVisible(true);
              setDeleteDialogCollection(settingsCollection);
            }}>
            <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>Delete</Text>
          </TouchableOpacity>
          <Divider />
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
          <Text style={{...styles.tinyText}}>Are you sure you want to delete the collection "{settingsCollection?.title}"?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <TouchableOpacity style={{...styles.button_text, width: '50%', height: 30}} activeOpacity={0.1} onPress={() => hideDeleteDialog()}>
            <Text style={{...styles.buttonText_outlined}}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{...styles.button_text, width: '50%', height: 30}} activeOpacity={0.1} onPress={() => deleteCollectionHandle()}>
            <Text style={{...styles.buttonText_outlined, color: theme.colors.error}}>Delete</Text>
          </TouchableOpacity>
        </Dialog.Actions>
      </Dialog>
      </Portal>
      <PublishDialog
        visible={showPublish}
        onDismiss={() => setShowPublish(false)}
        onPublish={async (desc, categoryIds) => {
          if (!settingsCollection?.collectionId) return;
          await publishCollection(settingsCollection.collectionId, desc, categoryIds);
          setIsSettingsCollectionPublished(true);
          // Ensure the collection is Public after publishing
          try {
            const updated = { ...settingsCollection, visibility: 'Public' } as Collection;
            await updateCollectionDB(updated);
            const updatedCollections = collections.map(c => 
              c.collectionId === updated.collectionId ? updated : c
            );
            setCollections(updatedCollections);
          } catch (e) {
            console.error('Failed to set visibility Public after publish', e);
          }
          setSnackbarMessage('Collection published');
          setSnackbarVisible(true);
        }}
      />
      
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
    </View>
    </>
  );
}
