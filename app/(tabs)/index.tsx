import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Divider, FAB, Portal } from 'react-native-paper';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import CollectionItem from '../components/collectionItem';
import { Collection, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

export default function Index() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);
  const homePageStats = useAppStore((state) => state.homePageStats);
  const setCollections = useAppStore((state) => state.setCollections);
  const [settingsCollection, setSettingsCollection] = useState<Collection | undefined>(undefined);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);

  const [visible, setVisible] = React.useState(false);

  const hideDialog = () => setVisible(false);

  useEffect(() => { // Apparently this runs even if the user is not logged in
    if (useAppStore.getState().user.username === 'Default User') {
      return;
    }
  }, []);


  // Animations

  const offset = .1;
  const settingsSheetHeight = height * (.45 + offset);
  const settingsClosedPosition = height;
  const settingsOpenPosition = height - settingsSheetHeight + (height * offset);

  const settingsTranslateY = useSharedValue(settingsClosedPosition);
  const settingsStartY = useSharedValue(0);

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

        <View style={{ height: 'auto', width: '100%' }}>
          <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center' }}>
            <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Ionicons name="flame" size={32} color={theme.colors.onBackground} style={{ marginRight: 5 }} />
              <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...styles.tinyText, fontSize: 22, fontWeight: '900', marginBottom: -3, marginTop: -3 }}>{user.streakLength || 0}</Text>
                </View>
                <Text style={{ ...styles.tinyText, fontSize: 14 }}>Day Streak</Text>
              </View>
              <Ionicons name='chevron-forward' size={20} color={'gray'} />
            </View>
          </TouchableOpacity>
          <Divider style={{ marginBottom: 10, marginTop: 10 }} />

          <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center' }}>
            <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Ionicons name="checkmark-done" size={28} color={theme.colors.onBackground} style={{ marginRight: 8 }} />
              <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...styles.tinyText, fontSize: 22, fontWeight: '900', marginBottom: -3, marginTop: -3 }}>{user.versesMemorized || '0'}</Text>
                </View>
                <Text style={{ ...styles.tinyText, fontSize: 14 }}>Verses Memorized</Text>
              </View>
              <Ionicons name='chevron-forward' size={20} color={'gray'} />
            </View>
          </TouchableOpacity>
          <Divider style={{ marginBottom: 10, marginTop: 10 }} />

          <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center' }}>
            <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Ionicons name="extension-puzzle" size={28} color={theme.colors.onBackground} style={{ marginRight: 8 }} />
              <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {user.versesOverdue > 0 ? <Ionicons name='alert-circle' size={22} color={theme.colors.error} /> : null}
                  <Text style={{ ...styles.tinyText, fontSize: 22, fontWeight: '900', marginBottom: -3, marginTop: -3, marginLeft: user.versesOverdue > 0 ? 5 : 0 }}>{user.versesOverdue || 0}</Text>
                </View>
                <Text style={{ ...styles.tinyText, fontSize: 14 }}>Verses Overdue</Text>
              </View>
              <Ionicons name='chevron-forward' size={20} color={'gray'} />
            </View>
          </TouchableOpacity>
          <Divider style={{ marginBottom: 10, marginTop: 10 }} />

          <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center' }}>
            <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Ionicons name="people" size={28} color={theme.colors.onBackground} style={{ marginRight: 8 }} />
              <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...styles.tinyText, fontSize: 22, fontWeight: '900', marginBottom: -3, marginTop: -3 }}>{user.numberPublishedCollections || 0}</Text>
                </View>
                <Text style={{ ...styles.tinyText, fontSize: 14 }}>Published Collections</Text>
              </View>
              <Ionicons name='chevron-forward' size={20} color={'gray'} />
            </View>
          </TouchableOpacity>
          <Divider style={{ marginBottom: 10, marginTop: 10 }} />
        </View>


        <Text style={{ ...styles.subheading, marginTop: 20 }}>My Verses</Text>
        <View style={styles.collectionsContainer}>

          {collections.map((collection) => (
            <CollectionItem key={collection.collectionId} collection={collection} onMenuPress={handleMenuPress} />
          ))}

        </View>
      </ScrollView>
      <FAB
        icon="plus"
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          zIndex: 10,
          backgroundColor: theme.colors.secondary,
        }}
        onPress={() => router.push('../collections/addnew')}
      />

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
            activeOpacity={1}
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
      </Portal>
    </View>
  );
}
