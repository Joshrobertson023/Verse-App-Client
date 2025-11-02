import React, { useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Portal } from 'react-native-paper';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Collection, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

interface SheetProps {
    children: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({children}) => {
    const styles = useStyles();
    const theme = useAppTheme();
    const user = useAppStore((state) => state.user);
    const collections = useAppStore((state) => state.collections);
    const addCollection = useAppStore((state) => state.addCollection);
    const homePageStats = useAppStore((state) => state.homePageStats);
    const setCollections = useAppStore((state) => state.setCollections);
    const [settingsCollection, setSettingsCollection] = useState<Collection | undefined>(undefined);
    const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [deleteDialogCollection, setDeleteDialogCollection] = useState<Collection | undefined>(undefined);
    const deleteCollectionStore = useAppStore((state) => state.removeCollection);
    const [localSortBy, setLocalSortBy] = useState('');
    const [orderedCollections, setOrderedCollections] = useState<Collection[]>(collections);

    const [visible, setVisible] = React.useState(false);

    const hideDialog = () => setVisible(false);
    const hideDeleteDialog = () => setDeleteDialogVisible(false);

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


    return (
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
                    {children}
                </Animated.View>
              </Portal>
    )
}

export default Sheet;