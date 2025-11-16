import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Dialog, Divider, Portal } from 'react-native-paper';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { FriendItemSkeleton } from '../components/skeleton';
import { getFriends, removeFriend, submitUserReport } from '../db';
import { useAppStore, User } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function FriendsScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [isSettingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);

  const { height } = Dimensions.get('window');
  const offset = .1;
  const settingsSheetHeight = height * (.30 + offset);
  const settingsClosedPosition = height;
  const settingsOpenPosition = height - settingsSheetHeight + (height * offset);
  const settingsTranslateY = useSharedValue(settingsClosedPosition);
  const settingsStartY = useSharedValue(0);

  const openSettingsSheet = (friend: User) => {
    setSelectedFriend(friend);
    setSettingsSheetOpen(true);
    settingsTranslateY.value = withSpring(settingsOpenPosition, {
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,
    });
  };

  const closeSettingsSheet = () => {
    settingsTranslateY.value = withSpring(settingsClosedPosition, {
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,
    }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(setSettingsSheetOpen)(false);
      }
    });
  };

  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsTranslateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const sheetProgress = (settingsClosedPosition - settingsTranslateY.value) / settingsSheetHeight;
    const opacity = Math.min(1, Math.max(0, sheetProgress)) * 0.5;
    return { opacity, pointerEvents: opacity > 0.001 ? 'auto' : 'none' };
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
          energyThreshold: 6e-9,
        });
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

  const sheetItemStyle = StyleSheet.create({
    settingsItem: {
      height: 50,
      justifyContent: 'center',
      alignItems: 'center'
    }
  });

  useFocusEffect(
    useCallback(() => {
      if (!user?.username || user.username === 'Default User') {
        return;
      }
      loadFriends(user.username);
    }, [user?.username])
  );

  const loadFriends = async (username: string) => {
    try {
      setLoading(true);
      const data = await getFriends(username);
      // Sort alphabetically to match share dialogs
      const sorted = [...data].sort((a, b) => {
        const aName = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim().toLowerCase();
        const bName = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      });
      setFriends(sorted);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFriend = ({ item: friend }: { item: User }) => (
    <View 
      style={{
        backgroundColor: theme.colors.surface,
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center'
      }}
    >
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
        onPress={() => router.push(`/user/${friend.username}`)}
        activeOpacity={0.35}
      >
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: theme.colors.onBackground,
          marginRight: 12,
          overflow: 'hidden'
        }}>
          {friend.profilePictureUrl ? (
            <Image
              source={{ uri: friend.profilePictureUrl }}
              style={{ width: 48, height: 48 }}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="person" size={24} color={theme.colors.onBackground} />
          )}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.onBackground,
            fontFamily: 'Inter'
          }}>
            {friend.firstName} {friend.lastName}
          </Text>
          <Text style={{
            fontSize: 14,
            color: theme.colors.onSurfaceVariant,
            fontFamily: 'Inter'
          }}>
            @{friend.username}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => openSettingsSheet(friend)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.onSurfaceVariant} style={{ marginRight: 8 }} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={24} color={theme.colors.onSurfaceVariant} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, padding: 20 }}>
        {loading ? (
          <>
            <FriendItemSkeleton />
            <FriendItemSkeleton />
            <FriendItemSkeleton />
          </>
        ) : friends.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons 
              name="people-outline" 
              size={64} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginTop: 16,
              fontFamily: 'Inter'
            }}>
              No friends yet. Go to the search page to find people you know.
            </Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.username}
            renderItem={renderFriend}
            style={{ flex: 1 }}
          />
        )}
      </View>
      <View style={{ height: 60 }} />
      <Portal>
        <Animated.View
          style={[{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998,
          }, backdropAnimatedStyle]}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.5} onPress={() => { setSelectedFriend(null); closeSettingsSheet(); }} />
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
          paddingBottom: 60,
          zIndex: 9999,
        }, settingsAnimatedStyle]}>
          <GestureDetector gesture={settingsPanGesture}>
            <View style={{ padding: 20, marginTop: -20, alignItems: 'center' }}>
              <View style={{ width: 50, height: 4, borderRadius: 2, backgroundColor: theme.colors.onBackground }} />
            </View>
          </GestureDetector>

          <Divider />
          <TouchableOpacity
            style={sheetItemStyle.settingsItem}
            disabled={busy || !selectedFriend}
            onPress={() => {
              if (!selectedFriend) return;
              closeSettingsSheet();
              setConfirmRemoveVisible(true);
            }}
          >
            <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500', color: theme.colors.error }}>Remove friend</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity
            style={sheetItemStyle.settingsItem}
            disabled={busy || !selectedFriend}
            onPress={async () => {
              if (!selectedFriend) return;
              try {
                setBusy(true);
                await submitUserReport(user.username, selectedFriend.username, 'Reported from friends list');
                closeSettingsSheet();
                alert('User reported');
              } catch (error) {
                console.error('Failed to report user:', error);
                alert('Failed to report user');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ ...styles.tinyText, fontSize: 16, fontWeight: '500' }}>Report user</Text>
          </TouchableOpacity>
          <Divider />
        </Animated.View>
      </Portal>
      <Portal>
        <Dialog visible={confirmRemoveVisible} onDismiss={() => setConfirmRemoveVisible(false)}>
          <Dialog.Content>
            <Text style={{ ...styles.tinyText }}>
              {selectedFriend ? `Remove @${selectedFriend.username} from your friends?` : 'Remove this friend?'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <TouchableOpacity
              style={{ ...styles.button_text, width: '50%', height: 30 }}
              onPress={() => { setConfirmRemoveVisible(false); setSelectedFriend(null); }}
              disabled={busy}
            >
              <Text style={{ ...styles.buttonText_outlined }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.button_text, width: '50%', height: 30 }}
              onPress={async () => {
                if (!selectedFriend) return;
                try {
                  setBusy(true);
                  await removeFriend(user.username, selectedFriend.username);
                  setConfirmRemoveVisible(false);
                  setSelectedFriend(null);
                  await loadFriends(user.username);
                } catch (error) {
                  console.error('Failed to remove friend:', error);
                  alert('Failed to remove friend');
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              <Text style={{ ...styles.buttonText_outlined, color: theme.colors.error }}>Remove</Text>
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

