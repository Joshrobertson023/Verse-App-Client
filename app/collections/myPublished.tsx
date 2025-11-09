import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Portal, Snackbar } from 'react-native-paper';
import { Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { getCollectionById, getCollectionByPublishedId, getPublishedCollection, getPublishedCollectionsByAuthor, getUserCollections, unpublishCollection, PublishedCollection } from '../db';
import { Collection, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

export default function MyPublishedCollections() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const setEditingCollection = useAppStore((state) => state.setEditingCollection);

  const [isLoading, setIsLoading] = useState(false);
  const [publishedCollections, setPublishedCollections] = useState<PublishedCollection[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [settingsCollection, setSettingsCollection] = useState<PublishedCollection | null>(null);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);

  const offset = 0.1;
  const settingsSheetHeight = height * (0.3 + offset);
  const settingsClosedPosition = height;
  const settingsOpenPosition = height - settingsSheetHeight + height * offset;

  const settingsTranslateY = useSharedValue(settingsClosedPosition);
  const settingsStartY = useSharedValue(0);

  const openSettingsSheet = useCallback(() => {
    setIsSettingsSheetOpen(true);
    settingsTranslateY.value = withSpring(settingsOpenPosition, {
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,
    });
  }, [settingsOpenPosition, settingsTranslateY]);

  const handleAfterClose = useCallback((callback?: () => void) => {
    if (callback) {
      callback();
    }
    setSettingsCollection(null);
    setIsSettingsSheetOpen(false);
  }, []);

  const closeSettingsSheet = useCallback(
    (onCloseComplete?: () => void) => {
      settingsTranslateY.value = withSpring(
        settingsClosedPosition,
        {
          stiffness: 900,
          damping: 110,
          mass: 2,
          overshootClamping: true,
          energyThreshold: 6e-9,
        },
        (isFinished) => {
          'worklet';
          if (isFinished) {
            runOnJS(handleAfterClose)(onCloseComplete);
          }
        }
      );
    },
    [handleAfterClose, settingsClosedPosition, settingsTranslateY]
  );

  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsTranslateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const sheetProgress =
      (settingsClosedPosition - settingsTranslateY.value) / settingsSheetHeight;

    const opacity = Math.min(1, Math.max(0, sheetProgress)) * 0.5;

    return {
      opacity,
    };
  });

  const settingsPanGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      settingsStartY.value = settingsTranslateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newPosition = settingsStartY.value + event.translationY;
      settingsTranslateY.value = Math.max(settingsOpenPosition, newPosition);
    })
    .onEnd((event) => {
      'worklet';
      const SWIPE_DISTANCE_THRESHOLD = 120;
      const VELOCITY_THRESHOLD = 500;

      const isDraggedDownFar =
        settingsTranslateY.value > settingsOpenPosition + SWIPE_DISTANCE_THRESHOLD;
      const isFlickedDown = event.velocityY > VELOCITY_THRESHOLD;

      if (isDraggedDownFar || isFlickedDown) {
        settingsTranslateY.value = withSpring(
          settingsClosedPosition,
          {
            stiffness: 900,
            damping: 110,
            mass: 2,
            overshootClamping: true,
            energyThreshold: 6e-9,
          },
          (isFinished) => {
            'worklet';
            if (isFinished) {
              runOnJS(handleAfterClose)();
            }
          }
        );
      } else {
        settingsTranslateY.value = withSpring(settingsOpenPosition, {
          stiffness: 900,
          damping: 110,
          mass: 2,
          overshootClamping: true,
          energyThreshold: 6e-9,
        });
      }
    });

  const loadPublishedCollections = useCallback(async () => {
    if (!user?.username || user.username === 'Default User') {
      setPublishedCollections([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPublishedCollectionsByAuthor(user.username);
      setPublishedCollections(data ?? []);
    } catch (error) {
      console.error('Failed to load published collections', error);
      setErrorMessage('Failed to load published collections');
    } finally {
      setIsLoading(false);
    }
  }, [user?.username]);

  useFocusEffect(
    useCallback(() => {
      loadPublishedCollections();
    }, [loadPublishedCollections])
  );

  const formattedCollections = useMemo(() => {
    return (publishedCollections ?? []).map((collection) => ({
      ...collection,
      publishedDateDisplay: collection.publishedDate ? new Date(collection.publishedDate) : null,
      passageCount: collection.userVerses?.length ?? 0,
    }));
  }, [publishedCollections]);

  const handleEdit = useCallback(async () => {
    const active = settingsCollection;
    if (!active) return;

    try {
      let collectionId = active.collectionId ?? null;
      let targetCollection: Collection | undefined;

      if (collectionId) {
        targetCollection = collections.find((col) => col.collectionId === collectionId);
      }

      if (!targetCollection) {
        if (!collectionId) {
          try {
            const publishedDetails = await getPublishedCollection(active.publishedId);
            collectionId = publishedDetails?.collectionId ?? null;

            if (collectionId) {
              targetCollection = collections.find((col) => col.collectionId === collectionId);
            }
          } catch (lookupError) {
            console.error('Failed to lookup published collection details', lookupError);
          }
        }
      }

      if (!targetCollection && collectionId) {
        const fetched = await getCollectionById(collectionId);
        if (fetched) {
          targetCollection = {
            ...fetched,
            userVerses: fetched.userVerses || [],
            favorites: fetched.title === 'Favorites',
          };
        }
      }

      if (!targetCollection) {
        const fetched = await getCollectionByPublishedId(active.publishedId);
        if (fetched) {
          collectionId = fetched.collectionId ?? collectionId;
          targetCollection = {
            ...fetched,
            userVerses: fetched.userVerses || [],
            favorites: fetched.title === 'Favorites',
          };
        }
      }

      if (!targetCollection || !collectionId) {
        setSnackbarMessage('Collection no longer exists');
        closeSettingsSheet();
        return;
      }

      setEditingCollection(targetCollection);
      closeSettingsSheet(() => {
        router.push('../collections/editCollection');
      });
    } catch (error) {
      console.error('Failed to prepare collection for editing', error);
      setSnackbarMessage('Failed to open collection editor');
    }
  }, [closeSettingsSheet, collections, setEditingCollection, settingsCollection]);

  const handleRemove = useCallback(async () => {
    const active = settingsCollection;
    if (!active) return;
    if (!active.collectionId) {
      setSnackbarMessage('Unable to remove this collection');
      closeSettingsSheet();
      return;
    }

    setIsRemoving(true);
    try {
      await unpublishCollection(active.collectionId);
      await loadPublishedCollections();
      try {
        const refreshedCollections = await getUserCollections(user.username);
        setCollections(refreshedCollections);
      } catch (innerError) {
        console.error('Failed to refresh local collections after unpublish', innerError);
      }
      setSnackbarMessage('Collection removed from Explore');
    } catch (error) {
      console.error('Failed to unpublish collection', error);
      setSnackbarMessage('Failed to remove collection');
    } finally {
      setIsRemoving(false);
      closeSettingsSheet();
    }
  }, [closeSettingsSheet, loadPublishedCollections, setCollections, settingsCollection, user.username]);

  const openSettings = (collection: PublishedCollection) => {
    setIsRemoving(false);
    setSettingsCollection(collection);
    openSettingsSheet();
  };

  const renderItem = ({ item }: { item: PublishedCollection & { publishedDateDisplay: Date | null; passageCount: number } }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.1}
        onPress={() => router.push(`../explore/collection/${item.publishedId}`)}
        style={{
          width: '100%',
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 6,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ ...styles.text, fontFamily: 'Inter bold', marginBottom: 4 }} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ ...styles.tinyText, opacity: 0.8, marginBottom: 8 }}>
              {item.publishedDateDisplay ? item.publishedDateDisplay.toLocaleDateString() : 'Unknown date'}
            </Text>
            <Text style={{ ...styles.tinyText, color: theme.colors.primary }}>
              {item.passageCount} {item.passageCount === 1 ? 'passage' : 'passages'}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.1} onPress={() => openSettings(item)}>
            <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.onBackground} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'My Published Collections',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.onBackground,
        }}
      />

      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingHorizontal: 20,
          paddingTop: 20,
        }}
      >
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : errorMessage ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={{ ...styles.button_outlined, marginTop: 12, width: 140 }}
              onPress={loadPublishedCollections}
            >
              <Text style={styles.buttonText_outlined}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : formattedCollections.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="planet-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={{ ...styles.text, marginTop: 16, textAlign: 'center' }}>
              You have not published any collections yet.
            </Text>
            <Text style={{ ...styles.tinyText, opacity: 0.7, marginTop: 8, textAlign: 'center' }}>
              Publish a collection to make it appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={formattedCollections}
            keyExtractor={(item) => item.publishedId.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      {isSettingsSheetOpen && (
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
              backdropAnimatedStyle,
            ]}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.5}
              onPress={() => closeSettingsSheet()}
            />
          </Animated.View>

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
                paddingBottom: 48,
                paddingTop: 12,
                zIndex: 9999,
              },
              settingsAnimatedStyle,
            ]}
          >
            <GestureDetector gesture={settingsPanGesture}>
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <View
                  style={{
                    width: 48,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.onSurfaceVariant,
                    opacity: 0.6,
                  }}
                />
              </View>
            </GestureDetector>

            <TouchableOpacity
              style={{ paddingVertical: 14, alignItems: 'center' }}
              activeOpacity={0.1}
              onPress={handleEdit}
            >
              <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: theme.colors.outline, opacity: 0.2 }} />
            <TouchableOpacity
              style={{ paddingVertical: 14, alignItems: 'center' }}
              activeOpacity={0.1}
              onPress={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color={theme.colors.error} />
              ) : (
                <Text
                  style={{
                    ...styles.tinyText,
                    fontSize: 16,
                    fontWeight: '600',
                    color: theme.colors.error,
                  }}
                >
                  Remove
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Portal>
      )}

      <Snackbar
        visible={snackbarMessage != null}
        duration={3000}
        onDismiss={() => setSnackbarMessage(null)}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Text style={{ color: theme.colors.onSurface, fontFamily: 'Inter' }}>
          {snackbarMessage}
        </Text>
      </Snackbar>
    </View>
  );
}

