import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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

  const verseCount = userVerses.length;
  const displayText = verseCount === 1 
    ? `"${userVerses[0].readableReference}"` 
    : `${verseCount} passage${verseCount > 1 ? 's' : ''}`;

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, width: '85%', maxHeight: '70%', padding: 20 }}>
            <Text style={{ fontFamily: 'Noto Serif bold', fontSize: 20, color: theme.colors.onBackground, marginBottom: 20 }}>
              Share Verse
            </Text>

            <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 10, fontFamily: 'Inter' }}>
              Share {displayText} with a friend
            </Text>

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

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }} onPress={() => { setSelectedFriend(null); onClose(); }}>
                <Text style={{ ...styles.tinyText, color: theme.colors.onBackground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, opacity: selectedFriend && sharing === null ? 1 : 0.5 }}
                onPress={handleShare}
                disabled={!selectedFriend || sharing !== null}
              >
                {sharing !== null ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ ...styles.tinyText, color: '#fff' }}>Share</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}




