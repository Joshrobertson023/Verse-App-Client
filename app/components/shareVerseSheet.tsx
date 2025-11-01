import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getFriends, shareVerse } from '../db';
import { useAppStore, User } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface ShareVerseSheetProps {
  visible: boolean;
  verseReference: string | null;
  onClose: () => void;
  onShareSuccess?: (friendUsername: string) => void;
  onShareError?: () => void;
}

export default function ShareVerseSheet({ visible, verseReference, onClose, onShareSuccess, onShareError }: ShareVerseSheetProps) {
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
      const data = await getFriends(user.username);
      setFriends(data);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!verseReference || !selectedFriend) return;
    setSharing(selectedFriend.username);
    try {
      await shareVerse(user.username, selectedFriend.username, verseReference);
      setSelectedFriend(null);
      onClose();
      if (onShareSuccess) onShareSuccess(selectedFriend.username);
    } catch (error) {
      console.error('Failed to share verse:', error);
      if (onShareError) onShareError();
    } finally {
      setSharing(null);
    }
  };

  if (!verseReference) return null;

  return (
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
            Share "{verseReference}" with a friend
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
  );
}



