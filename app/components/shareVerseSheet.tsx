import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { getFriendNames, shareVerse } from '../db';
import { useAppStore, User, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface ShareVerseSheetProps {
  visible: boolean;
  userVerses: UserVerse[];
  onClose: () => void;
  onShareSuccess?: (friendUsername: string) => void;
  onShareError?: () => void;
}

export default function ShareVerseSheet({ visible, userVerses, onClose, onShareSuccess, onShareError }: ShareVerseSheetProps) {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);

  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await getFriendNames(user.username);
      setFriends(data);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!userVerses || userVerses.length === 0 || !selectedFriend) return;
    setSharing(selectedFriend.username);
    try {
      // Extract verse references (readableReference) - this works even if verses aren't saved to a collection
      const verseReferences = userVerses
        .map(uv => uv.readableReference)
        .filter((ref): ref is string => ref !== undefined && ref !== null && ref.trim() !== '');
      
      if (verseReferences.length === 0) {
        throw new Error('No verses found to share. Make sure to just share reference');
      }
      
      await shareVerse(user.username, selectedFriend.username, verseReferences);
      setSelectedFriend(null);
      onClose();
      if (onShareSuccess) onShareSuccess(selectedFriend.username);
    } catch (error) {
      console.error('Failed to share verse:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to share verse';
      if (onShareError) {
        onShareError();
      } else {
        // If no error handler, show alert
        alert(errorMessage);
      }
    } finally {
      setSharing(null);
    }
  };

  if (!userVerses || userVerses.length === 0) return null;

  const verseReference = userVerses.length === 1 
    ? userVerses[0].readableReference || 'Verse'
    : `${userVerses.length} passages`;

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1}
            onPress={() => {
              setSelectedFriend(null);
              onClose();
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ backgroundColor: theme.colors.surface, borderRadius: 12, width: '90%', maxWidth: 400, maxHeight: '70%', padding: 20 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'Noto Serif bold', fontSize: 20, color: theme.colors.onBackground }}>
                  Share {verseReference}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedFriend(null);
                    onClose();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.surface2,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="close" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

            <ScrollView>
              {loading ? (
                <View style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : friends.length === 0 ? (
                <View style={{ justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                  <Ionicons name="people-outline" size={64} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ fontSize: 16, color: theme.colors.onSurfaceVariant, marginTop: 16, fontFamily: 'Inter', textAlign: 'center' }}>
                    No friends yet
                  </Text>
                </View>
              ) : (
                friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.username}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      marginBottom: 8,
                      backgroundColor: selectedFriend?.username === friend.username ? theme.colors.primary : 'transparent',
                      borderRadius: 8,
                    }}
                    onPress={() => setSelectedFriend(friend)}
                  >
                    <Text style={{ ...styles.tinyText, fontSize: 16, color: selectedFriend?.username === friend.username ? '#fff' : theme.colors.onBackground }}>
                      {friend.firstName} {friend.lastName}
                    </Text>
                    <Text style={{ ...styles.tinyText, fontSize: 14, color: selectedFriend?.username === friend.username ? 'rgba(255, 255, 255, 0.8)' : theme.colors.onSurfaceVariant }}>
                      @{friend.username}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

              <TouchableOpacity
                style={{
                  backgroundColor: (selectedFriend && sharing === null) ? theme.colors.primary : theme.colors.surface2,
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 16,
                  opacity: (selectedFriend && sharing === null) ? 1 : 0.5,
                }}
                onPress={handleShare}
                disabled={!selectedFriend || sharing !== null}
                activeOpacity={0.7}
              >
                {sharing !== null ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{
                    fontSize: 16,
                    color: '#fff',
                    fontFamily: 'Inter',
                    fontWeight: '600'
                  }}>
                    Share
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}




