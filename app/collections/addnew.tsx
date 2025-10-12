  import React, { useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TextInput } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import AddPassage from '../components/addPassage';
import useStyles from '../styles';
import useAppTheme from '../theme';

  const { height } = Dimensions.get('window');

  export default function Index() {
    const styles = useStyles();
    const theme = useAppTheme();
    const [title, setTitle] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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


    

    return (
      <View style={styles.container}>
        <TextInput label="Collection Title" value={title} onChangeText={setTitle} style={styles.input} />

        <TouchableOpacity style={{...styles.button_outlined}} onPress={openSheet}>
          <Text style={{...styles.buttonText_outlined}}>Add Passage</Text>
        </TouchableOpacity>

        { errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null }
          <TouchableOpacity style={{...styles.button_filled, position: 'absolute', bottom: 80, zIndex: 10, alignSelf: 'center'}} onPress={() => {
            if (title.trim() === '') {
              setErrorMessage('Title cannot be empty.')
              return;
            } else {
              setErrorMessage('');
            }

            alert('Collection added!');
            setTitle('');
            setErrorMessage('');
          }}>
            <Text style={{...styles.buttonText_filled}}>Create Collection</Text>
          </TouchableOpacity>
          <Animated.View style={[{position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  height: sheetHeight,
                                  backgroundColor: theme.colors.surface,
                                  borderTopLeftRadius: 16,
                                  borderTopRightRadius: 16,
                                  padding: 20,
                                  zIndex: 10,
                                  boxShadow: '1px 1px 15px rgba(0, 0, 0, 0.2)',
                                }, animatedStyle]}>
            <GestureDetector gesture={panGesture}>
              <View style={{padding: 20, marginTop: -20}}>
                <View style={{width: 70, height: 2, borderRadius: 20, borderWidth: 2, alignSelf: 'center'}}></View>
              </View>
          </GestureDetector>
              <AddPassage />
          </Animated.View>
      </View>
    )
  }
