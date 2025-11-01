import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View, Modal } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkRelationship, getCollectionById, getUserNotificationsPaged, getUserVersesByCollectionWithVerses, markAllNotificationsAsRead, respondToFriendRequest, addUserVersesToNewCollection, updateCollectionDB, getUserCollections } from './db';
import { Collection, Notification, UserVerse, Verse, useAppStore } from './store';
import SaveVerseToCollectionSheet from './components/saveVerseToCollectionSheet';
import useStyles from './styles';
import useAppTheme from './theme';

export default function NotificationsScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const setNumNotifications = useAppStore((state) => state.setNumNotifications);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursorCreated, setNextCursorCreated] = useState<string | null>(null);
  const [nextCursorId, setNextCursorId] = useState<number | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [acceptedRequests, setAcceptedRequests] = useState<Set<number>>(new Set());
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [pickedCollection, setPickedCollection] = useState<Collection | undefined>(undefined);
  const [verseFromNotification, setVerseFromNotification] = useState<Verse | null>(null);
  const collections = useAppStore((s) => s.collections);
  const setCollections = useAppStore((s) => s.setCollections);
  const [isSavingToCollection, setIsSavingToCollection] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      // Mark all notifications as read when page is opened
      markAllAsRead();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const page = await getUserNotificationsPaged(user.username, 10);
      const data: Notification[] = page.items;
      setNextCursorCreated(page.nextCursorCreated ?? null);
      setNextCursorId(page.nextCursorId ?? null);
      setHasMore(Boolean(page.nextCursorCreated && page.nextCursorId != null));

      const friendRequestNotifications = data.filter((n: Notification) => n.notificationType === 'FRIEND_REQUEST');
      const acceptedSet = new Set<number>();
      
      for (const notification of friendRequestNotifications) {
        const relationshipStatus = await checkRelationship(notification.senderUsername, user.username);
        if (relationshipStatus === 1) {
          acceptedSet.add(notification.id);
        }
      }
      
      setAcceptedRequests(acceptedSet);
      setNotifications(data);
      
      // Update unread count in store
      const unreadCount = data.filter((n: Notification) => !n.isRead).length;
      if (setNumNotifications) {
        setNumNotifications(unreadCount);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !nextCursorCreated || nextCursorId == null) return;
    try {
      setIsLoadingMore(true);
      const page = await getUserNotificationsPaged(user.username, 10, nextCursorCreated, nextCursorId);
      const newItems: Notification[] = page.items;

      // update friend request accepted set for new items only
      const friendRequests = newItems.filter((n) => n.notificationType === 'FRIEND_REQUEST');
      if (friendRequests.length > 0) {
        const updated = new Set<number>(acceptedRequests);
        for (const n of friendRequests) {
          const status = await checkRelationship(n.senderUsername, user.username);
          if (status === 1) updated.add(n.id);
        }
        setAcceptedRequests(updated);
      }

      setNotifications((prev) => [...prev, ...newItems]);
      setNextCursorCreated(page.nextCursorCreated ?? null);
      setNextCursorId(page.nextCursorId ?? null);
      setHasMore(Boolean(page.nextCursorCreated && page.nextCursorId != null));
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(user.username);
      // Update local state - mark all as read
      setNotifications(prev => prev.map((n: Notification) => ({ ...n, isRead: true })));
      if (setNumNotifications) {
        setNumNotifications(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleRespondToFriendRequest = async (notification: Notification, accept: boolean) => {
    try {
      await respondToFriendRequest(notification.senderUsername, user.username, accept);
      
      // Mark as accepted instead of removing
      if (accept) {
        setAcceptedRequests(prev => new Set(prev).add(notification.id));
        setSnackbarMessage('Friend request accepted!');
      } else {
        // Remove from list if declined
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        setSnackbarMessage('Friend request declined');
      }
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
      setSnackbarMessage('Failed to respond to friend request');
      setSnackbarVisible(true);
    }
  };


  const formatTimestamp = (dateString: string) => {
    // Parse the date - handle both UTC and local time formats
    let date: Date;
    
    // Check if the string ends with Z (UTC indicator) or has timezone info
    if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-') && dateString.match(/[+-]\d{2}:\d{2}$/)) {
      // Date string has timezone info, parse as-is
      date = new Date(dateString);
    } else {
      // Date string has no timezone info, assume UTC and treat as UTC
      // Add Z to force UTC parsing
      date = new Date(dateString + 'Z');
    }
    
    const now = new Date();
    
    // Debug logging
    console.log('Notification date string:', dateString);
    console.log('Parsed date (ISO):', date.toISOString());
    console.log('Parsed date (local):', date.toLocaleString());
    console.log('Now (ISO):', now.toISOString());
    console.log('Now (local):', now.toLocaleString());
    
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(Math.abs(diffMs) / 60000);
    const diffHours = Math.floor(Math.abs(diffMs) / 3600000);
    const diffDays = Math.floor(Math.abs(diffMs) / 86400000);

    console.log('Diff in ms:', diffMs, 'Diff hours:', diffHours);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // Return formatted date if older than a week
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isSystemNotification = (notification: Notification) => {
    return notification.senderUsername === 'SYSTEM' || notification.notificationType === 'VERSE_OF_DAY';
  };

  const isExpired = (notification: Notification) => {
    if (!notification.expirationDate) return false;
    const expirationDate = new Date(notification.expirationDate);
    return new Date() > expirationDate;
  };

  const parseSharedCollectionInfo = (message: string): { collectionId?: number; collectionTitle?: string } => {
    const collectionIdMatch = message.match(/COLLECTION_ID:(\d+)/);
    const collectionTitleMatch = message.match(/COLLECTION_TITLE:(.+?)(?:\||$)/);
    
    return {
      collectionId: collectionIdMatch ? parseInt(collectionIdMatch[1]) : undefined,
      collectionTitle: collectionTitleMatch ? collectionTitleMatch[1] : undefined
    };
  };

  const handleViewSharedCollection = async (notification: Notification) => {
    const collectionInfo = parseSharedCollectionInfo(notification.message);
    console.log('Notification message:', notification.message);
    console.log('Parsed collectionInfo:', collectionInfo);
    
    if (!collectionInfo.collectionId) {
      console.error('No collectionId found in notification message');
      setSnackbarMessage('Failed to parse collection info');
      setSnackbarVisible(true);
      return;
    }
    
    try {
      console.log('Fetching collection with ID:', collectionInfo.collectionId);
      // Fetch the collection metadata (title, visibility, verseOrder, etc.)
      const collectionMetadata = await getCollectionById(collectionInfo.collectionId);
      
      // Fetch the userVerses with their verses populated
      const userVerses = await getUserVersesByCollectionWithVerses(collectionInfo.collectionId);
      
      // Update the username for each userVerse to be the current user
      // Reset all progress fields to 0% since this is a new collection for the current user
      // (the fetched userVerses have the original sharer's username and progress)
      const updatedUserVerses = userVerses.map((uv) => ({
        ...uv,
        id: undefined, // Remove the ID since this will be a new userVerse
        username: user.username,
        collectionId: undefined, // Remove the collectionId since this will be a new collection
        progressPercent: 0, // Reset progress
        timesMemorized: 0, // Reset memorization count
        lastPracticed: undefined, // Clear last practiced date
        dateMemorized: undefined, // Clear memorization date
        dateAdded: undefined, // Will be set when collection is created
      }));
      
      // Create a new collection object with the fetched data
      const sharedCollection: Collection = {
        title: collectionMetadata.title,
        visibility: collectionMetadata.visibility,
        verseOrder: collectionMetadata.verseOrder,
        userVerses: updatedUserVerses,
        favorites: false,
      };
      
      // Store the collection in the store so addnew.tsx can access it
      const { setNewCollection } = useAppStore.getState();
      setNewCollection(sharedCollection);
      
      // Navigate to addnew page
      router.push('../collections/addnew');
    } catch (error) {
      console.error('Failed to view shared collection:', error);
      setSnackbarMessage('Failed to load collection');
      setSnackbarVisible(true);
    }
  };

  const renderNotificationIcon = (notification: Notification) => {
    if (isSystemNotification(notification)) {
      // System notifications show shield icon
      return (
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: theme.colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: theme.colors.onBackground
        }}>
          <Ionicons name="shield" size={24} color="#fff" />
        </View>
      );
    }
    
    // Regular user notifications show person icon
    return (
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.onBackground
      }}>
        <Ionicons name="person" size={24} color={theme.colors.onBackground} />
      </View>
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.isRead;
    const isFriendRequest = item.notificationType === 'FRIEND_REQUEST';
    const isSharedCollection = item.notificationType === 'SHARED_COLLECTION';
    const isSharedVerse = item.notificationType === 'SHARED_VERSE';
    const expired = isSharedCollection && isExpired(item);
    const verseRefMatch = isSharedVerse ? item.message.match(/VERSE_REF:([^|]+)/) : null;
    const verseTextMatch = isSharedVerse ? item.message.match(/VERSE_TEXT:([^|]+)/) : null;
    
    return (
      <View
        style={{
          flexDirection: 'row',
          padding: 12,
          backgroundColor: theme.colors.surface,
          marginBottom: 1
        }}
      >
        {/* Unread indicator */}
        {isUnread && (
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#007AFF',
            marginRight: 8,
            marginTop: 4
          }} />
        )}
        {!isUnread && <View style={{ width: 8, marginRight: 8 }} />}

        {/* Icon */}
        <View style={{ marginRight: 12 }}>
          {renderNotificationIcon(item)}
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.onBackground,
            marginBottom: 4,
            fontFamily: 'Inter'
          }}>
            {isSystemNotification(item) ? 'System' : item.senderUsername}
          </Text>
          
          <Text style={{
            fontSize: 14,
            color: theme.colors.onSurfaceVariant,
            fontFamily: 'Inter',
            lineHeight: 20
          }}>
            {item.message.split('|')[0]}
            {expired && ' (Expired)'}
          </Text>
          
          <Text style={{
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
            fontFamily: 'Inter'
          }}>
            {formatTimestamp(item.createdDate)}
          </Text>

          {/* Friend Request Action Buttons */}
          {isFriendRequest && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {acceptedRequests.has(item.id) ? (
                <View style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: theme.colors.surface,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.onSurfaceVariant
                }}>
                  <Text style={{
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                    fontWeight: '600'
                  }}>
                    Accepted
                  </Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => handleRespondToFriendRequest(item, true)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: theme.colors.primary,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      color: theme.colors.onPrimary,
                      fontFamily: 'Inter',
                      fontWeight: '600'
                    }}>
                      Accept
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRespondToFriendRequest(item, false)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: theme.colors.errorContainer,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      color: theme.colors.onErrorContainer,
                      fontFamily: 'Inter',
                      fontWeight: '600'
                    }}>
                      Decline
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Shared Collection Action Button */}
          {isSharedCollection && !expired && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => handleViewSharedCollection(item)}
                style={{
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: theme.colors.surface2,
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  View Collection
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Shared Verse Content and Action */}
          {isSharedVerse && (
            <View style={{ marginTop: 12 }}>
              {verseRefMatch && (
                <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter', fontWeight: '600', marginBottom: 6 }}>
                  {verseRefMatch[1]}
                </Text>
              )}
              {verseTextMatch && (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Inter', marginBottom: 10 }}>
                  {verseTextMatch[1]}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => {
                  const ref = verseRefMatch ? verseRefMatch[1] : '';
                  const text = verseTextMatch ? verseTextMatch[1] : '';
                  setVerseFromNotification({ verse_reference: ref, text } as Verse);
                  setPickedCollection(undefined);
                  setShowSavePicker(true);
                }}
                style={{
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: theme.colors.surface2,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter', fontWeight: '600' }}>
                  Save to Collection
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dismiss button (disabled per requirements - don't allow deleting) */}
        {!isSystemNotification(item) && (
          <View style={{
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: 0.3
          }}>
          </View>
        )}
      </View>
    );
  };

  const handleConfirmSaveSharedVerse = async () => {
    if (!pickedCollection || !verseFromNotification || !user?.username || isSavingToCollection) return;

    setIsSavingToCollection(true);
    const userVerse: UserVerse = {
      username: user.username,
      readableReference: verseFromNotification.verse_reference,
      verses: [verseFromNotification]
    } as any;
    try {
      await addUserVersesToNewCollection([userVerse], pickedCollection.collectionId!);
      const currentOrder = pickedCollection.verseOrder || '';
      const newOrder = currentOrder ? `${currentOrder}${verseFromNotification.verse_reference},` : `${verseFromNotification.verse_reference},`;
      const updatedCollection = { ...pickedCollection, userVerses: [...pickedCollection.userVerses, userVerse], verseOrder: newOrder } as Collection;
      await updateCollectionDB(updatedCollection);
      try {
        const updatedCollections = await getUserCollections(user.username);
        setCollections(updatedCollections);
      } catch {}
      setShowSavePicker(false);
      setVerseFromNotification(null);
      setPickedCollection(undefined);
      setSnackbarMessage('Verse saved to collection');
      setSnackbarVisible(true);
    } catch (e) {
      setSnackbarMessage('Failed to save verse');
      setSnackbarVisible(true);
    } finally {
      setIsSavingToCollection(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (notifications.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="notifications-off" size={64} color={theme.colors.onSurfaceVariant} />
          <Text style={{
            fontSize: 18,
            fontWeight: '500',
            color: theme.colors.onSurfaceVariant,
            marginTop: 16,
            fontFamily: 'Inter'
          }}>
            You're all caught up
          </Text>
          <Text style={{
            fontSize: 14,
            color: theme.colors.onSurfaceVariant,
            marginTop: 8,
            textAlign: 'center',
            fontFamily: 'Inter'
          }}>
            You'll see notifications here when someone interacts with you or sends you updates.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ flexGrow: 1 }}
        onEndReachedThreshold={0.2}
        onEndReached={loadMore}
        ListFooterComponent={isLoadingMore ? (
          <View style={{ paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={{ padding: 20 }}>
            <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
              No notifications
            </Text>
          </View>
        }
      />
      {/* Save to collection picker */}
      <SaveVerseToCollectionSheet
        visible={showSavePicker}
        verse={verseFromNotification}
        collections={collections}
        pickedCollection={pickedCollection}
        setPickedCollection={setPickedCollection}
        onCancel={() => setShowSavePicker(false)}
        onConfirm={handleConfirmSaveSharedVerse}
        confirming={isSavingToCollection}
      />
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Text style={{ color: theme.colors.onSurface }}>
          {snackbarMessage}
        </Text>
      </Snackbar>
      <View style={{ height: 60 }} />
    </View>
  );
}