import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackHandler, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { ActivityIndicator, Divider, Portal, Surface, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';
import { addUserVersesToNewCollection, createCollectionDB, getMostRecentCollectionId, getUserCollections, getUserVersesPopulated, refreshUser, updateCollectionDB, updateCollectionsOrder } from '../db';
import { useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

// Ordering functions for user verses
function orderCustom(userVerses: UserVerse[], verseOrder?: string): UserVerse[] {
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

function orderByProgress(userVerses: UserVerse[]): UserVerse[] {
  return [...userVerses].sort((a, b) => {
    const aProgress = a.progressPercent || 0;
    const bProgress = b.progressPercent || 0;
    return aProgress - bProgress; // Sort ascending (lowest first)
  });
}

export default function Index() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const setUser = useAppStore((state) => state.setUser);
  const updateCollection = useAppStore((state) => state.updateCollection);
  const params = useLocalSearchParams();
  const setCollectionsSheetControls = useAppStore((state) => state.setCollectionsSheetControls);

    const navigation = useNavigation();

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    const [loadingVerses, setLoadingVerses] = useState(false);
    const [userVerses, setUserVerses] = useState<UserVerse[]>([]);
    const [orderedUserVerses, setOrderedUserVerses] = useState<UserVerse[]>([]);
    const [versesSortBy, setVersesSortBy] = useState(0); // 0 = custom order, 1 = progress
    const [isVersesSettingsSheetOpen, setIsVersesSettingsSheetOpen] = useState(false);
    const [isCreatingCopy, setIsCreatingCopy] = useState(false);
    const isFetchingRef = useRef(false);
    
    const collection = useAppStore((state) =>
      state.collections.find((c) => c.collectionId?.toString() === params.id)
  );

  const handleCreateCopy = async () => {
    if (!collection) return;
    
    setIsCreatingCopy(true);
    try {
      // Create a duplicate collection
      const duplicateCollection = {
        ...collection,
        title: `${collection.title} (Copy)`,
        collectionId: undefined, // Will be assigned by API
      };

      // Create the collection in the database
      await createCollectionDB(duplicateCollection, user.username);
      const newCollectionId = await getMostRecentCollectionId(user.username);

      // Add userVerses to the new collection
      if (collection.userVerses && collection.userVerses.length > 0) {
        await addUserVersesToNewCollection(collection.userVerses, newCollectionId);
      }

      // Get updated collections list
      const updatedCollections = await getUserCollections(user.username);
      setCollections(updatedCollections);

      // Add new collection ID to the collections order
      const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
      const newOrder = currentOrder ? `${currentOrder},${newCollectionId}` : newCollectionId.toString();
      const updatedUser = { ...user, collectionsOrder: newOrder };
      setUser(updatedUser);

      // Update in database
      try {
        await updateCollectionsOrder(newOrder, user.username);
      } catch (error) {
        console.error('Failed to update collections order:', error);
      }

      // Fetch updated user from server
      const refreshedUser = await refreshUser(user.username);
      setUser(refreshedUser);
    } catch (error) {
      console.error('Failed to create collection copy:', error);
    } finally {
      setIsCreatingCopy(false);
    }
  };


useEffect(() => {
  if (collection) {
    setCollectionsSheetControls({ openSettingsSheet, collection });
  }
}, [collection]);

useFocusEffect(
  useCallback(() => {
    if (!collection || isFetchingRef.current) return;
    
    console.log('Running fetchPopulated for collection:', collection.title, 'verseOrder:', collection.verseOrder);
    
    const fetchPopulated = async () => {
      isFetchingRef.current = true;
      setLoadingVerses(true);
      try {
        const colToSend = { ...collection, UserVerses: collection.userVerses ?? [] };
        console.log('Sending collection with verseOrder:', colToSend.verseOrder);
        console.log('Sending collection userVerses order:', colToSend.UserVerses.map(uv => uv.readableReference));
        const data = await getUserVersesPopulated(colToSend);
        console.log('Received collection with verseOrder:', data.verseOrder);
        console.log('Received collection userVerses order:', data.userVerses.map(uv => uv.readableReference));
        setUserVerses(data.userVerses ?? []);
        updateCollection(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingVerses(false);
        isFetchingRef.current = false;
      }
    };
    
    fetchPopulated();
  }, [collection?.collectionId, collection?.verseOrder])
);

// Order verses based on sort setting
useEffect(() => {
  if (!userVerses || userVerses.length === 0) {
    setOrderedUserVerses([]);
    return;
  }
  
  let ordered: UserVerse[] = [];
  
  if (versesSortBy === 0) {
    console.log('Applying orderCustom with verseOrder:', collection?.verseOrder);
    console.log('UserVerses before ordering:', userVerses.map(uv => uv.readableReference));
    ordered = orderCustom(userVerses, collection?.verseOrder);
    console.log('UserVerses after ordering:', ordered.map(uv => uv.readableReference));
  } else if (versesSortBy === 1) {
    ordered = orderByProgress(userVerses);
  } else {
    ordered = userVerses;
  }
  
  setOrderedUserVerses(ordered);
}, [userVerses, collection?.verseOrder, versesSortBy]);

useLayoutEffect(() => {
  if (collection) {
    navigation.setOptions({
      title: collection.title,
    });
  }
}, [collection]);


// Animations


    const [sheetVisible, setSheetVisible] = useState(false);

  const offset = .1;
   const sheetHeight = height * (.89 + offset);
   const closedPosition = height;
    const openPosition = height - sheetHeight + (height * offset);
    const peekPosition = height;

  const settingsSheetHeight = height * (.40 + offset);
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
      settingsTranslateY.value = withSpring(settingsOpenPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
      setSheetVisible(true);
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
      settingsTranslateY.value = withSpring(settingsClosedPosition, {       
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,});
      setSheetVisible(true);
    }

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

// End animations

const openVersesSettingsSheet = () => {
  versesSettingsTranslateY.value = withSpring(settingsOpenPosition, {       
  stiffness: 900,
  damping: 110,
  mass: 2,
  overshootClamping: true,
  energyThreshold: 6e-9,});
  setIsVersesSettingsSheetOpen(true);
  setSheetVisible(true);
};

const closeVersesSettingsSheet = () => {
  versesSettingsTranslateY.value = withSpring(settingsClosedPosition, {       
  stiffness: 900,
  damping: 110,
  mass: 2,
  overshootClamping: true,
  energyThreshold: 6e-9,});
  setIsVersesSettingsSheetOpen(false);
  setSheetVisible(false);
};

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

const clickPlus = () => {

}

const addPassage = () => {
  closeSheet();

}

// Handle Android back button to close sheets
useEffect(() => {
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
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
}, [sheetVisible, isVersesSettingsSheetOpen]);

    if (loadingVerses) {
        return (
            <View style={{...styles.container, alignItems: 'center', justifyContent: 'center', marginTop: -100}}>
                <ActivityIndicator size={70} animating={true} />
            </View>
        )
    } else {
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
          <TouchableOpacity 
            style={{...styles.button_outlined, marginBottom: 10}}
            onPress={openVersesSettingsSheet}
          >
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <Ionicons name="settings" size={20} color={theme.colors.onBackground} />
              <Text style={{...styles.buttonText_outlined}}>Sort Passages</Text>
            </View>
          </TouchableOpacity>
          <View>
            {(orderedUserVerses || []).map((userVerse: UserVerse) => (

                <View key={userVerse.id} style={{minWidth: '100%', marginBottom: 20}}>
                    <Surface style={{minWidth: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface}} elevation={4}>

                        <View>
                          <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{userVerse.readableReference}</Text>
                          {(userVerse.verses || []).map((verse) => (
                              <View key={verse.verse_reference} style={{}}>
                                  <View>
                                      <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{verse.verse_Number}: {verse.text} </Text>
                                  </View>
                              </View>
                          ))}
                        </View>
                        <View style={{alignItems: 'stretch', justifyContent: 'space-between'}}>
                          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                            <View>
                              <View style={{flexDirection: 'row'}}>
                                <View style={{}}>
                                  <Ionicons name={"sync-circle-outline"} size={45} color={theme.colors.onBackground} />
                                </View>
                                <View style={{flexDirection: 'column', marginLeft: 5}}>
                                  <Text style={{...styles.text, margin: 0}}>{userVerse.progressPercent || 0}%</Text>
                                  <Text style={{...styles.tinyText, marginTop: -20}}>Memorized</Text>
                                </View>
                              </View>
                              <TouchableOpacity 
                                style={{...styles.button_outlined, height: 30, marginTop: 5}}
                                onPress={() => {
                                  useAppStore.getState().setEditingUserVerse(userVerse);
                                  router.push('/practiceSession');
                                }}
                              >
                                <Text style={{...styles.buttonText_outlined}}>Practice</Text>
                              </TouchableOpacity>
                            </View>
                            <View style={{flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', paddingTop: 10}}>
                              <TouchableOpacity onPress={() => {}}>
                                <Ionicons name={"ellipsis-vertical"} size={32} color={theme.colors.onBackground} />
                              </TouchableOpacity>
                              <View style={{alignSelf: 'flex-end', marginTop: 15}}>
                                <View style={{}}>
                                  <Text style={{...styles.tinyText}}>{userVerse.dateAdded ? new Date(userVerse.dateAdded).toISOString().slice(0, 10) : ''}</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>

                    </Surface>
                </View>

            ))}
          </View>
          <View style={{height: 0}}></View>
        </ScrollView>

        <Portal>
            {sheetVisible && (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 10,
                  },
                  backdropAnimatedStyle,
                ]}
                pointerEvents="auto"
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={() => {
                    closeSettingsSheet();
                    closeSheet();
                  }}
                />
              </Animated.View>
            )}

            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: settingsSheetHeight,
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  paddingTop: 20,
                  paddingBottom: 80,
                  zIndex: 20, // 👈 higher than backdrop
                  elevation: 20,
                  boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)',
                },
                settingsAnimatedStyle,
              ]}
            >
              <GestureDetector gesture={settingsPanGesture}>
                          <View style={{ padding: 20, marginTop: -20, alignItems: 'center' }}>
                            <View style={{ width: 50, height: 4, borderRadius: 2, backgroundColor: theme.colors.onBackground }} />
                          </View>
                        </GestureDetector>
              
                        <Divider />
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
                            {collection?.visibility === 'Public' ? 'Make Private' : 'Make Public'}
                          </Text>
                        </TouchableOpacity>
                        <Divider />
                        <TouchableOpacity
                          style={sheetItemStyle.settingsItem}
                          onPress={() => {
                            closeSettingsSheet();
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Publish</Text>
                        </TouchableOpacity>
                        <Divider />
                        <TouchableOpacity
                          style={sheetItemStyle.settingsItem}
                          onPress={() => {
                            closeSettingsSheet();
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>Delete</Text>
                        </TouchableOpacity>
                        <Divider />
            </Animated.View>

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
              <AddPassage onAddPassage={addPassage} onClickPlus={clickPlus} />
            </Animated.View>

            {/* Verses Settings Sheet */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: settingsSheetHeight,
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  paddingTop: 20,
                  paddingBottom: 80,
                  zIndex: 21,
                  elevation: 21,
                  boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)',
                },
                versesSettingsAnimatedStyle,
              ]}
            >
              <GestureDetector gesture={versesSettingsPanGesture}>
                <View style={{ padding: 20, marginTop: -20, alignItems: 'center' }}>
                  <View style={{ width: 50, height: 4, borderRadius: 2, backgroundColor: theme.colors.onBackground }} />
                </View>
              </GestureDetector>
              
              <Text style={{...styles.text, fontSize: 20, fontWeight: '600', marginBottom: 20, marginTop: 10, alignSelf: 'center'}}>Sort Passages By:</Text>
              <Divider />
              <TouchableOpacity
                style={sheetItemStyle.settingsItem}
                onPress={() => {
                  closeVersesSettingsSheet();
                  // Navigate to reorder existing verses page
                  const setEditingCollection = useAppStore.getState().setEditingCollection;
                  if (collection) {
                    setEditingCollection(collection);
                    router.push('../collections/reorderExistingVerses');
                  }
                }}>
                <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Custom Order (Reorder)</Text>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                style={sheetItemStyle.settingsItem}
                onPress={() => {
                  setVersesSortBy(1);
                  closeVersesSettingsSheet();
                }}>
                <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: versesSortBy === 1 ? '700' : '500' }}>Percent Memorized</Text>
              </TouchableOpacity>
              <Divider />
            </Animated.View>

            {isVersesSettingsSheetOpen && (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 11,
                  },
                  versesBackdropAnimatedStyle,
                ]}
                pointerEvents="auto"
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={() => {
                    closeVersesSettingsSheet();
                  }}
                />
              </Animated.View>
            )}
          </Portal>
        </View>
      );
    }
}