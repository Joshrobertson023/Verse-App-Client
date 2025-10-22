  import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator, Divider, Surface, TextInput } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';
import { addUserVersesToNewCollection, createCollectionDB, getMostRecentCollectionId, getUserCollections } from '../db';
import { useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

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
    const [creatingCollection, setCreatingCollection] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0.0);
    const setCollections = useAppStore((state) => state.setCollections);
    const [loading, setLoading] = useState(false);
    const [visibility, setVisibility] = useState('Private');

   const sheetHeight = height * .96;
   const closedPosition = height;
    const openPosition = height - sheetHeight;
    const peekPosition = height;

    const settingsSheetHeight = height * .5;
    const settingsClosedPosition = height;
    const settingsOpenPosition = height - settingsSheetHeight;

    const translateY = useSharedValue(closedPosition);
    const startY = useSharedValue(0);

    const settingsTranslateY = useSharedValue(settingsClosedPosition);
    const settingsStartY = useSharedValue(0);

    const openSheet = () => {
      translateY.value = withSpring(openPosition, { damping: 90, stiffness: 900 });
    };

    const openSettingsSheet = () => {
      settingsTranslateY.value = withSpring(settingsOpenPosition, { damping: 90, stiffness: 900});
    }

    const closeSheet = () => {
      translateY.value = withSpring(closedPosition, { damping: 90, stiffness: 900 });
    };

    const closeSettingsSheet = () => {
      settingsTranslateY.value = withSpring(settingsClosedPosition, { damping: 90, stiffness: 900});
    }

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const settingsAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: settingsTranslateY.value }],
    }));

    const settingsPanGesture = Gesture.Pan()
      .onBegin(() => {
        settingsStartY.value = settingsTranslateY.value;
      })
      .onUpdate(e => {
        settingsTranslateY.value = Math.max(settingsOpenPosition, settingsStartY.value + e.translationY);
      })
      .onEnd(() => {
        if (settingsTranslateY.value > settingsOpenPosition + 50) {
          settingsTranslateY.value = withSpring(settingsClosedPosition, {damping: 90, stiffness: 900});
        } else {
          settingsTranslateY.value = withSpring(settingsOpenPosition, { damping: 90, stiffness: 900});
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
          translateY.value = withSpring(peekPosition, { damping: 90, stiffness: 900 });
        } else {
          translateY.value = withSpring(openPosition, { damping: 90, stiffness: 900 });
        }
      });

      const handleCreateCollection = async () => {
            if (title.trim() === '') {
              alert('Title cannot be empty.')
              return;
            } else {
              setErrorMessage('');
            }
            setCreatingCollection(true);

            newCollection.authorUsername = user.username;
            newCollection.visibility = visibility;
            newCollection.verseOrder = newCollection.userVerses.join(",");
            newCollection.title = title;
            setProgressPercent(.50);
            await createCollectionDB(newCollection, user.username);
            const id = await getMostRecentCollectionId(user.username);
            await addUserVersesToNewCollection(newCollection.userVerses, id);
            const collections = await getUserCollections(user.username);
            setCollections(collections);
            // Delete this: (since we need all new uvs ids, just re-grab collections when getting to home)
            // addCollection(collection);
            resetNewCollection();
            setTitle('');
            setErrorMessage('');
            setProgressPercent(1);
            setCreatingCollection(false);
            router.replace("/");
      }

      const handleDeleteUV = (userVerse: UserVerse) => {
        const updatedUserVerses = newCollection.userVerses.filter(uv => uv.readableReference !== userVerse.readableReference);
          setNewCollection({...newCollection, userVerses: updatedUserVerses});
      }
    

    return (
      <View style={{...styles.container}}>
      <ScrollView style={{width: '100%'}}>
        <TextInput label="Collection Title" value={title} onChangeText={setTitle} style={styles.input} mode='outlined' />

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

        {/* User Verse Card */}
        <View style={{marginTop: 20}}>
          {newCollection?.userVerses.map((userVerse, i) => (

            <View key={userVerse.readableReference} style={{width: '100%', marginBottom: 20}}>
                <Surface style={{width: '100%', padding: 20, borderRadius: 3}} elevation={4}>
                  <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                    <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{userVerse.readableReference}</Text>
                    <TouchableOpacity style={{}} onPress={() => {handleDeleteUV(userVerse)}}>
                      <Ionicons name={"trash-bin"} size={20} color={theme.colors.onBackground} />
                    </TouchableOpacity>
                  </View>
                    {userVerse.verses.map((verse) => (
                        <View key={verse.verse_reference} style={{}}>
                            <View>
                                <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{verse.verse_Number}: {verse.text}</Text>
                            </View>
                        </View>
                    ))}
                </Surface>
            </View>

          ))}
        </View>


          <View style={{height: 120}}></View>
        </ScrollView>

          <View style={{...styles.button_filled, position: 'absolute', bottom: 60, zIndex: 10, alignSelf: 'center', backgroundColor: theme.colors.onPrimary,
          boxShadow: '0px 0px 43px 20px rgba(0,0,0,.5)'
          }}></View>

          <TouchableOpacity style={{...styles.button_filled, position: 'absolute', bottom: 60, zIndex: 10, alignSelf: 'center'
          }} activeOpacity={.2} onPress={handleCreateCollection}>
            {creatingCollection ? (
                        <Text style={styles.buttonText_filled}>
                            <ActivityIndicator animating={true} color={theme.colors.background} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_filled}>Create Collection</Text>
                    )}
          </TouchableOpacity>

          <Animated.View style={[{position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  height: sheetHeight,
                                  backgroundColor: theme.colors.surface,
                                  borderTopLeftRadius: 16,
                                  borderTopRightRadius: 16,
                                  paddingTop: 20,
                                  paddingBottom: 80,
                                  zIndex: 999,
                                  boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)',
                                }, animatedStyle]}>
            <GestureDetector gesture={panGesture}>
              <View style={{padding: 20, marginTop: -20}}>
                <View style={{width: 70, height: 2, borderRadius: 20, borderWidth: 2, alignSelf: 'center', borderColor: theme.colors.onBackground}}></View>
              </View>
          </GestureDetector>
              <AddPassage onAddPassage={closeSheet} />
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
                        zIndex: 99,
                        elevation: 50,
                        boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)'
                    }, settingsAnimatedStyle]}>
            <GestureDetector gesture={settingsPanGesture}>
              <View style={{padding: 20, marginTop: -20}}>
                <View style={{width: 70, height: 2, borderRadius: 20, borderWidth: 2, alignSelf: 'center', borderColor: theme.colors.onBackground}}></View>
              </View>
            </GestureDetector>
            <Divider />
            <TouchableOpacity style={{...styles.button_text}} onPress={() => {
              setVisibility('Private');
              closeSettingsSheet();
            }}>
              <Text style={{...styles.tinyText}}>Private</Text>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity style={{...styles.button_text}} onPress={() => {
              setVisibility('Public');
              closeSettingsSheet();
            }}>
              <Text style={{...styles.tinyText}}>Public</Text>
            </TouchableOpacity>
            <Divider />
          </Animated.View>
          </View>
    )
  }
