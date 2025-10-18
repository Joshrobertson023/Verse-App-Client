  import React, { useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ProgressBar, TextInput } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';
import UserVerseCard from '../components/userVerse';
import { createCollectionDB } from '../db';
import { useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

export default function Index() {
    const styles = useStyles();
    const theme = useAppTheme();
    const [title, setTitle] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const newCollection = useAppStore((state) => state.newCollection);
    const addCollection = useAppStore((state) => state.addCollection);
    const resetNewCollection = useAppStore((state) => state.resetNewCollection);
    const user = useAppStore((state) => state.user);
    const [creatingCollection, setCreatingCollection] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0.0);

   const sheetHeight = height * .96;
   const closedPosition = height;
    const openPosition = height - sheetHeight;
    const peekPosition = height;

    const translateY = useSharedValue(closedPosition);
    const startY = useSharedValue(0);

    const openSheet = () => {
      translateY.value = withSpring(openPosition, { damping: 90, stiffness: 900 });
    };

    const closeSheet = () => {
      translateY.value = withSpring(closedPosition, { damping: 90, stiffness: 900 });
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

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
            newCollection.visibility = 'Private';
            newCollection.verseOrder = newCollection.userVerses.join(",");
            setProgressPercent(.50);
            const collection = await createCollectionDB(newCollection, user.username);
            // Add all user verses
            // Set saved for all verses
            addCollection(collection);
            resetNewCollection();
            setTitle('');
            setErrorMessage('');
            setProgressPercent(1);
            setCreatingCollection(false);
      }


    

    return (
      <View style={{...styles.container}}>
          <ScrollView style={{width: '100%'}}>
        <TextInput label="Collection Title" value={title} onChangeText={setTitle} style={styles.input} mode='outlined' />

        <TouchableOpacity style={{...styles.button_outlined}} onPress={openSheet}>
          <Text style={{...styles.buttonText_outlined}}>Add Passage</Text>
        </TouchableOpacity>

        { errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null }

        <View style={{marginTop: 20}}>
          {newCollection?.userVerses.map((userVerse, i) => (
            <UserVerseCard uvKey={i} userVerse={userVerse}/>
          ))}
        </View>


          <View style={{height: 120}}></View>
          </ScrollView>
          <View style={{...styles.button_filled, position: 'absolute', bottom: 60, zIndex: 10, alignSelf: 'center', backgroundColor: theme.colors.onPrimary,
          boxShadow: '0px 0px 43px 20px rgba(0,0,0,.5)'
          }}></View>
          <TouchableOpacity style={{...styles.button_filled, position: 'absolute', bottom: 60, zIndex: 10, alignSelf: 'center'
          }} activeOpacity={.2} onPress={handleCreateCollection}>
            {creatingCollection ? <ProgressBar progress={0.5} color={theme.colors.background} /> : <Text style={{...styles.buttonText_filled}}>Create Collection</Text>}
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
                                  zIndex: 10,
                                  boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)',
                                }, animatedStyle]}>
            <GestureDetector gesture={panGesture}>
              <View style={{padding: 20, marginTop: -20}}>
                <View style={{width: 70, height: 2, borderRadius: 20, borderWidth: 2, alignSelf: 'center', borderColor: theme.colors.onBackground}}></View>
              </View>
          </GestureDetector>
              <AddPassage />
          </Animated.View>
          </View>
    )
  }
