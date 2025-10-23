import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { ActivityIndicator, Divider, Portal, Surface, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';
import { getUserVersesPopulated } from '../db';
import { useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

export default function Index() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const updateCollection = useAppStore((state) => state.updateCollection);
  const params = useLocalSearchParams();
  const setCollectionsSheetControls = useAppStore((state) => state.setCollectionsSheetControls);

    const navigation = useNavigation();

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    const [loadingVerses, setLoadingVerses] = useState(false);
    const [userVerses, setUserVerses] = useState<UserVerse[]>([]);
    
    const collection = useAppStore((state) =>
      state.collections.find((c) => c.collectionId?.toString() === params.id)
  );

useEffect(() => {
  setCollectionsSheetControls({ openSettingsSheet, collection })

  if (!collection) return;

  if (collection.userVerses && collection.userVerses.every(uv => uv.verses?.length > 0)) {
    setUserVerses(collection.userVerses);
    return;
  }
  
  console.log('Running fetchPopulated for collection:', collection.title);
  
  const fetchPopulated = async () => {
    setLoadingVerses(true);
    try {
      const colToSend = { ...collection, UserVerses: collection.userVerses ?? [] };
      const data = await getUserVersesPopulated(colToSend);
      console.log(JSON.stringify(colToSend, null, 1));
      setUserVerses(data.userVerses ?? []);
      updateCollection(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVerses(false);
    }
  };
  
  fetchPopulated();
}, []);

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

const clickPlus = () => {

}

const addPassage = () => {
  closeSheet();

}

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
          <View>
            {userVerses.map((userVerse: UserVerse) => (

                <View key={userVerse.id} style={{width: '100%', marginBottom: 20}}>
                    <Surface style={{width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface}} elevation={4}>

                        <View>
                          <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{userVerse.readableReference}</Text>
                          {userVerse.verses.map((verse) => (
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
                              <TouchableOpacity style={{...styles.button_outlined, height: 30, marginTop: 5}}>
                                <Text style={{...styles.buttonText_outlined}}>Practice</Text>
                              </TouchableOpacity>
                            </View>
                            <View style={{flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', paddingTop: 10}}>
                              <TouchableOpacity onPress={() => {}}>
                                <Ionicons name={"ellipsis-vertical"} size={32} color={theme.colors.onBackground} />
                              </TouchableOpacity>
                              <View style={{alignSelf: 'flex-end', marginTop: 15}}>
                                <View style={{}}>
                                  <Text style={{...styles.tinyText}}>{userVerse.dateAdded ? userVerse.dateAdded.slice(0, 10) : ''}</Text>
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
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Edit</Text>
                        </TouchableOpacity>
                        <Divider />
                        <TouchableOpacity
                          style={sheetItemStyle.settingsItem}
                          onPress={() => {
                            closeSettingsSheet();
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Create Copy</Text>
                        </TouchableOpacity>
                        <Divider />
                        <TouchableOpacity
                          style={sheetItemStyle.settingsItem}
                          onPress={() => {
                            closeSettingsSheet();
                          }}>
                          <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Make Private</Text>
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
          </Portal>
        </View>
      );
    }
}