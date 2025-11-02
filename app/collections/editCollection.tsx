import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator, Divider, Portal, Surface, TextInput } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';
import { addUserVersesToNewCollection, deleteUserVersesFromCollection, getUserCollections, getUserVersesPopulated, updateCollectionDB } from '../db';
import { useAppStore, UserVerse, Verse } from '../store';
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
    const [sheetVisible, setSheetVisible] = useState(false);
    const [reorderedUserVerses, setReorderedUserVerses] = useState<UserVerse[]>([]);
    const updateCollectionStore = useAppStore((state) => state.updateCollection);
    const setEditingCollection = useAppStore((state) => state.setEditingCollection);

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
              // Update editingCollection with populated data (already sorted by server)
              setEditingCollection({ ...editingCollection, userVerses: sorted, verseOrder: data.verseOrder });
            } catch (err) {
              console.error(err);
              setReorderedUserVerses(editingCollection.userVerses || []);
            } finally {
              setLoadingVerses(false);
            }
          };
          
          fetchPopulated();
        }
      }
    }, [editingCollection]);

    // Update reorderedUserVerses when editingCollection changes (e.g., after reorder page)
    useEffect(() => {
      if (editingCollection?.userVerses) {
        // Sort by verseOrder if it exists
        const sorted = orderByVerseOrder(editingCollection.userVerses, editingCollection.verseOrder);
        setReorderedUserVerses(sorted);
        console.log('EditCollection: Updated reorderedUserVerses with verseOrder:', editingCollection.verseOrder);
      }
    }, [editingCollection?.userVerses, editingCollection?.verseOrder]);

    // Clean up editing state on unmount
    useEffect(() => {
      return () => {
        setEditingCollection(undefined);
      };
    }, [setEditingCollection]);

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
      });

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
            
            // Create verseOrder from reordered user verses using IDs
            let verseOrder = '';
            reorderedUserVerses.forEach((userVerse: UserVerse) => {
              if (userVerse.id) {
                verseOrder += userVerse.id + ',';
              } else {
                // For new verses that don't have an ID yet, use readableReference
                verseOrder += userVerse.readableReference + ',';
              }
            })
            updatedCollection.verseOrder = verseOrder;
            updatedCollection.userVerses = reorderedUserVerses;
            
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
        const updatedUserVerses = reorderedUserVerses.filter(uv => uv.readableReference !== userVerse.readableReference);
        setReorderedUserVerses(updatedUserVerses);
      }

      const addUserVerseToCollection = (userVerse: UserVerse) => {
        setReorderedUserVerses([...reorderedUserVerses, userVerse]);
      }

      // Handle Android back button to close sheets
      useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
          if (sheetVisible) {
            closeSheet();
            closeSettingsSheet();
            return true; // Prevent default back action
          }
          // If sheet is not visible, allow default back action to navigate away
          return false;
        });

        return () => backHandler.remove();
      }, [sheetVisible]);

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
          <Text style={{...styles.tinyText, marginRight: 10}}>Visibility: {visibility}</Text>
          <TouchableOpacity style={{...styles.button_outlined, width: 100, height: 30}} onPress={openSettingsSheet}>
            <Text style={{...styles.buttonText_outlined, fontSize: 14}}>Change</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={{...styles.button_outlined}} onPress={openSheet}>
          <Text style={{...styles.buttonText_outlined}}>Add Passage</Text>
        </TouchableOpacity>

        { errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null }

        {/* User Verse Cards */}
        {reorderedUserVerses.length > 0 && (
          <>
            <View style={{marginTop: 20, width: '100%'}}>
              {reorderedUserVerses.map((userVerse, i) => (
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
              ))}
            </View>
          </>
        )}
        <View style={{height: 120}}></View>
      </ScrollView>

          <View style={{...styles.button_filled, position: 'absolute', bottom: 60, width: '90%', zIndex: 10, alignSelf: 'center', backgroundColor: theme.colors.onPrimary,
          boxShadow: '0px 0px 23px 10px rgba(0,0,0,.2)'
          }}></View>

          <TouchableOpacity style={{...styles.button_filled, position: 'absolute', bottom: 60, zIndex: 10, marginHorizontal: 20, width: '90%', alignSelf: 'center'
          }} activeOpacity={0.1} onPress={handleCreateCollection}>
            {creatingCollection ? (
                        <Text style={styles.buttonText_filled}>
                            <ActivityIndicator animating={true} color={theme.colors.background} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_filled}>Update Collection</Text>
                    )}
          </TouchableOpacity>

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
                  activeOpacity={0.5}
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
                  zIndex: 20,
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
                            setVisibility('Private');
                            closeSettingsSheet();
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Private</Text>
                        </TouchableOpacity>
                        <Divider />
                        <TouchableOpacity
                          style={sheetItemStyle.settingsItem}
                          onPress={() => {
                            setVisibility('Public');
                            closeSettingsSheet();
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Public</Text>
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
          </Portal>

          </View>
    )
  }
