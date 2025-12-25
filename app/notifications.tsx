import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import SaveVerseToCollectionSheet from './components/saveVerseToCollectionSheet';
import { formatRelativeTime, isDateExpired, minutesSince } from './dateUtils';
import { addUserVersesToNewCollection, checkRelationship, createCollectionDB, getCollectionById, getMostRecentCollectionId, getUserCollections, getUserNotificationsPaged, getUserNotificationsTop, getUserProfile, getUserVersesByCollectionWithVerses, markAllNotificationsAsRead, populateVersesForUserVerses, refreshUser, respondToFriendRequest, updateCollectionDB, updateCollectionsOrder } from './db';
import { Collection, Notification, UserVerse, Verse, useAppStore } from './store';
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
  const [nextCursorId, setNextCursorId] = useState<number | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [acceptedRequests, setAcceptedRequests] = useState<Set<number>>(new Set());
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [pickedCollection, setPickedCollection] = useState<Collection | undefined>(undefined);
  const [userVerseFromNotification, setUserVerseFromNotification] = useState<UserVerse | null>(null);
  const collections = useAppStore((s) => s.collections);
  const setCollections = useAppStore((s) => s.setCollections);
  const incrementVerseSaveAdjustment = useAppStore((s) => s.incrementVerseSaveAdjustment);
  const [isSavingToCollection, setIsSavingToCollection] = useState(false);
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const setUser = useAppStore((s) => s.setUser);
  const numNotifications = useAppStore((state) => state.numNotifications);
  const [senderProfilePictures, setSenderProfilePictures] = useState<Map<string, string>>(new Map());

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
      const page = await getUserNotificationsTop(user.username, 10);
      const data: Notification[] = page.items;
      setNextCursorId(page.nextCursorId ?? null);
      setHasMore(Boolean(page.nextCursorId != null));

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
      
      // Fetch profile pictures for unique senders (excluding SYSTEM)
      const uniqueSenders = new Set<string>();
      data.forEach(n => {
        if (!isSystemNotification(n) && n.senderUsername) {
          uniqueSenders.add(n.senderUsername);
        }
      });
      
      // Fetch profile pictures for senders we don't have yet
      const newPictures = new Map<string, string>(senderProfilePictures);
      for (const senderUsername of uniqueSenders) {
        if (!newPictures.has(senderUsername)) {
          try {
            const senderProfile = await getUserProfile(senderUsername);
            if (senderProfile?.profilePictureUrl) {
              newPictures.set(senderUsername, senderProfile.profilePictureUrl);
            }
          } catch (error) {
            // Silently fail - just won't show profile picture
            console.error(`Failed to fetch profile picture for ${senderUsername}:`, error);
          }
        }
      }
      setSenderProfilePictures(newPictures);
      
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
    if (isLoadingMore || !hasMore || nextCursorId == null) return;
    try {
      setIsLoadingMore(true);
      const page = await getUserNotificationsPaged(user.username, 10, nextCursorId);
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
      setNextCursorId(page.nextCursorId ?? null);
      setHasMore(Boolean(page.nextCursorId != null));

      // Fetch profile pictures for new unique senders
      const uniqueSenders = new Set<string>();
      newItems.forEach(n => {
        if (!isSystemNotification(n) && n.senderUsername) {
          uniqueSenders.add(n.senderUsername);
        }
      });
      
      const newPictures = new Map<string, string>(senderProfilePictures);
      for (const senderUsername of uniqueSenders) {
        if (!newPictures.has(senderUsername)) {
          try {
            const senderProfile = await getUserProfile(senderUsername);
            if (senderProfile?.profilePictureUrl) {
              newPictures.set(senderUsername, senderProfile.profilePictureUrl);
            }
          } catch (error) {
            // Silently fail - just won't show profile picture
            console.error(`Failed to fetch profile picture for ${senderUsername}:`, error);
          }
        }
      }
      setSenderProfilePictures(newPictures);

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
    return formatRelativeTime(dateString);
  };

  const isSystemNotification = (notification: Notification) => {
    return notification.senderUsername === 'SYSTEM' || notification.notificationType === 'VERSE_OF_DAY';
  };

  const isExpired = (notification: Notification) => {
    if (isDateExpired(notification.expirationDate)) {
      return true;
    }

    const ageInMinutes = minutesSince(notification.createdDate);
    return ageInMinutes !== null && ageInMinutes >= 1440;
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
    if (isExpired(notification)) {
      setSnackbarMessage('This share link has expired.');
      setSnackbarVisible(true);
      return;
    }

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
      const collectionMetadata = await getCollectionById(collectionInfo.collectionId);
      if (!collectionMetadata) {
        throw new Error('COLLECTION_NOT_FOUND');
      }
      let userVerses = await getUserVersesByCollectionWithVerses(collectionInfo.collectionId);
      if (userVerses.length > 0) {
        try {
          userVerses = await populateVersesForUserVerses(userVerses);
        } catch (populateError) {
          console.warn('Failed to populate verses for shared collection:', populateError);
        }
      }

      const updatedUserVerses = userVerses.map((uv) => ({
        ...uv,
        id: undefined,
        username: user.username,
        collectionId: undefined,
        progressPercent: 0,
        timesMemorized: 0,
        lastPracticed: undefined,
        dateMemorized: undefined,
        dateAdded: undefined,
      }));
      
      const sharedCollection: Collection = {
        title: collectionMetadata.title,
        visibility: collectionMetadata.visibility,
        verseOrder: collectionMetadata.verseOrder,
        userVerses: updatedUserVerses,
        favorites: false,
      };
      
      const { setNewCollection } = useAppStore.getState();
      setNewCollection(sharedCollection);
      
      router.push('../collections/addnew');
    } catch (error) {
      const message = (error as Error)?.message ?? '';
      const normalized = message.toLowerCase();
      const isNetworkError = error instanceof TypeError || normalized.includes('failed to fetch') || normalized.includes('network request failed');
      if (
        normalized.includes('notfound') ||
        normalized.includes('not found') ||
        normalized.includes('does not exist') ||
        normalized.includes('collection_not_found') ||
        isNetworkError
      ) {
        setSnackbarMessage('This collection has been deleted by the author.');
      } else {
        setSnackbarMessage('Failed to load collection');
      }
      setSnackbarVisible(true);
    }
  };

  const renderNotificationIcon = (notification: Notification) => {
    if (isSystemNotification(notification)) {
      return (
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: theme.colors.onBackground,
        }}>
          <Ionicons name="shield" size={24} color="#fff" />
        </View>
      );
    }
    
    const senderPictureUrl = notification.senderUsername ? senderProfilePictures.get(notification.senderUsername) : null;
    
    return (
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.onBackground,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface
      }}>
        {senderPictureUrl ? (
          <Image
            source={{ uri: senderPictureUrl }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="person" size={24} color={theme.colors.onBackground} />
        )}
      </View>
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.isRead;
    const isFriendRequest = item.notificationType === 'FRIEND_REQUEST';
    const isSharedCollection = item.notificationType === 'SHARED_COLLECTION';
    const isSharedVerse = item.notificationType === 'SHARED_VERSE';
    const expired = isSharedCollection && isExpired(item);
    
    // Parse shared verse notification
    let verseReferences: string[] = [];
    let verseData: Array<{ reference: string; text: string }> = [];
    
    if (isSharedVerse) {
      // Parse VERSE_REFERENCES: readableReference|readableReference|...
      const verseRefsMatch = item.message.match(/VERSE_REFERENCES:([^|]+(?:\|[^|]+)*?)(?:\|VERSE_DATA:|$)/);
      if (verseRefsMatch) {
        verseReferences = verseRefsMatch[1].split('|').filter(ref => ref.trim());
      }
      
      // Parse VERSE_DATA: reference:text|reference:text|... (everything after VERSE_DATA: to end)
      const verseDataMatch = item.message.match(/VERSE_DATA:(.+)$/);
      if (verseDataMatch) {
        const dataParts = verseDataMatch[1].split('|');
        verseData = dataParts
          .map(part => {
            const colonIndex = part.indexOf(':');
            if (colonIndex > 0) {
              const ref = part.substring(0, colonIndex).trim();
              const text = part.substring(colonIndex + 1).trim();
              return { reference: ref, text: text };
            }
            return null;
          })
          .filter((v): v is { reference: string; text: string } => v !== null && v.reference !== '' && v.text !== '');
      }
    }
    
    return (
      <View
        style={{
          flexDirection: 'row',
          marginVertical: 12,
          marginHorizontal: 15,
          paddingBottom: 15,
          marginBottom: 1,
          borderBottomColor: theme.colors.gray,
          borderBottomWidth: 0.3,
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
        <View style={{ marginRight: 12, marginLeft: -15, marginTop: 2 }}>
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
            color: theme.colors.onBackground,
            fontFamily: 'Inter',
            lineHeight: 20
          }}>
            {item.message.split('|')[0]}
            {expired && ' (Expired)'}
          </Text>
          
          <Text style={{
            fontSize: 12,
            color: theme.colors.onBackground,
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
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.onBackground
                }}>
                  <Text style={{
                    color: theme.colors.onBackground,
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
                    activeOpacity={0.1}
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
                    activeOpacity={0.1}
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
                activeOpacity={0.1}
                style={{
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: theme.colors.surface,
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
              {verseReferences.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  {verseReferences.map((ref, idx) => (
                    <Text key={idx} style={{ 
                      color: theme.colors.onBackground, 
                      fontFamily: 'Inter bold', 
                      marginBottom: 4,
                      fontSize: 14
                    }}>
                      {ref}
                    </Text>
                  ))}
                </View>
              )}
              {verseData.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  {verseData.map((verse, idx) => (
                    <View key={idx} style={{ marginBottom: 8 }}>
                      <Text style={{ 
                        color: theme.colors.onBackground, 
                        fontFamily: 'Inter', 
                        fontSize: 13,
                        lineHeight: 18
                      }}>
                        {verse.text ? `"${verse.text}"` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {verseData.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.1}
                  onPress={() => {
                    // Create a UserVerse with all verses from the shared passage
                    const readableRef = verseReferences.length > 0 ? verseReferences[0] : verseData[0].reference;
                    const allVerses: Verse[] = verseData.map(v => ({
                      verse_reference: v.reference,
                      text: v.text
                    } as Verse));
                    
                    const userVerse: UserVerse = {
                      username: user.username,
                      readableReference: readableRef,
                      verses: allVerses
                    } as any;
                    
                    setUserVerseFromNotification(userVerse);
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
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleCreateNewCollection = async (title: string) => {
    if (!userVerseFromNotification || !user?.username || isCreatingNewCollection) return;
    if (collections.length >= 40) {
      setSnackbarMessage('You can create up to 40 collections.');
      setSnackbarVisible(true);
      return;
    }

    // Ensure readableReference is set
    if (!userVerseFromNotification.readableReference || userVerseFromNotification.readableReference.trim() === '') {
      setSnackbarMessage('Error: Verse reference is invalid');
      setSnackbarVisible(true);
      return;
    }

    setIsCreatingNewCollection(true);
    const userVerse: UserVerse = {
      ...userVerseFromNotification,
      username: user.username,
    };

    try {
      const finalTitle = title.trim() === '' ? 'New Collection' : (title.trim() === 'Favorites' ? 'Favorites-Other' : title.trim());
      const newCollection: Collection = {
        title: finalTitle,
        authorUsername: user.username,
        username: user.username,
        visibility: 'private',
        verseOrder: `${userVerse.readableReference},`,
        userVerses: [userVerse],
        notes: [],
        favorites: false,
      };

      await createCollectionDB(newCollection, user.username);
      const collectionId = await getMostRecentCollectionId(user.username);
      await addUserVersesToNewCollection([userVerse], collectionId);
      
      // Populate verses in memory and update collection
      try {
        const populatedUserVerses = await populateVersesForUserVerses([userVerse]);
        if (populatedUserVerses.length > 0) {
          const updatedCollection = {
            ...newCollection,
            collectionId,
            userVerses: populatedUserVerses
          };
          await updateCollectionDB(updatedCollection);
        }
      } catch (populateError) {
        console.warn('Failed to populate verses for new collection:', populateError);
      }
      
      const updatedCollections = await getUserCollections(user.username);
      setCollections(updatedCollections);

      const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
      const newOrder = currentOrder ? `${currentOrder},${collectionId}` : collectionId.toString();
      const updatedUser = { ...user, collectionsOrder: newOrder };
      setUser(updatedUser);
      await updateCollectionsOrder(newOrder, user.username);

      const refreshedUser = await refreshUser(user.username);
      setUser(refreshedUser);

      if (userVerse.readableReference) {
        incrementVerseSaveAdjustment(userVerse.readableReference);
      }
      setShowSavePicker(false);
      setUserVerseFromNotification(null);
      setPickedCollection(undefined);
      setSnackbarMessage('Collection created and verse saved');
      setSnackbarVisible(true);
    } catch (e) {
      console.error('Failed to create collection:', e);
      setSnackbarMessage('Failed to create collection');
      setSnackbarVisible(true);
    } finally {
      setIsCreatingNewCollection(false);
    }
  };

  const handleConfirmSaveSharedVerse = async () => {
    if (!pickedCollection || !userVerseFromNotification || !user?.username || isSavingToCollection) return;

    // Ensure readableReference is set
    if (!userVerseFromNotification.readableReference || userVerseFromNotification.readableReference.trim() === '') {
      setSnackbarMessage('Error: Verse reference is invalid');
      setSnackbarVisible(true);
      return;
    }

    setIsSavingToCollection(true);
    const userVerse: UserVerse = {
      ...userVerseFromNotification,
      username: user.username,
    };
    try {
      await addUserVersesToNewCollection([userVerse], pickedCollection.collectionId!);
      
      // Populate verses in memory
      let populatedUserVerse = userVerse;
      try {
        const populatedUserVerses = await populateVersesForUserVerses([userVerse]);
        if (populatedUserVerses.length > 0) {
          populatedUserVerse = populatedUserVerses[0];
        }
      } catch (populateError) {
        console.warn('Failed to populate verses for saved verse:', populateError);
      }
      
      const currentOrder = pickedCollection.verseOrder || '';
      const newOrder = currentOrder ? `${currentOrder}${userVerse.readableReference},` : `${userVerse.readableReference},`;
      const updatedCollection = { 
        ...pickedCollection, 
        userVerses: [...pickedCollection.userVerses, populatedUserVerse], 
        verseOrder: newOrder 
      } as Collection;
      await updateCollectionDB(updatedCollection);
      try {
        const updatedCollections = await getUserCollections(user.username);
        setCollections(updatedCollections);
      } catch {}
      if (userVerse.readableReference) {
        incrementVerseSaveAdjustment(userVerse.readableReference);
      }
      setShowSavePicker(false);
      setUserVerseFromNotification(null);
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
          <Ionicons name="notifications-off" size={64} color={theme.colors.onBackground} />
          <Text style={{
            fontSize: 18,
            fontWeight: '500',
            color: theme.colors.onBackground,
            marginTop: 16,
            fontFamily: 'Inter'
          }}>
            You're all caught up
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
        ListFooterComponent={ isLoadingMore ? (
          <View style={{ paddingVertical: 22, paddingBottom: 22 }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
          ) : (
          <View style={{ paddingVertical: 22, paddingBottom: 22 }}>
          </View>
          )}
        ListEmptyComponent={
          <View style={{ padding: 20 }}>
            <Text style={{ textAlign: 'center', color: theme.colors.onBackground }}>
              No notifications
            </Text>
          </View>
        }
      />
      {/* Save to collection picker */}
      <SaveVerseToCollectionSheet
        visible={showSavePicker}
        verse={userVerseFromNotification?.verses?.[0] || null}
        collections={collections.filter(col => {
          // Filter to only show collections owned by the user
          const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
          const owner = col.username ? normalize(col.username) : undefined;
          const author = col.authorUsername ? normalize(col.authorUsername) : undefined;
          const currentUser = normalize(user?.username);
          
          // Collection is owned by user if username matches OR authorUsername matches (and username is not set or also matches)
          return (owner === currentUser) || (author === currentUser && (!owner || owner === currentUser));
        })}
        pickedCollection={pickedCollection}
        setPickedCollection={setPickedCollection}
        onCancel={() => setShowSavePicker(false)}
        onConfirm={handleConfirmSaveSharedVerse}
        confirming={isSavingToCollection}
        onCreateNewCollection={handleCreateNewCollection}
        creatingNewCollection={isCreatingNewCollection}
      />
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.background }}
      >
        <Text style={{ color: theme.colors.onBackground }}>
          {snackbarMessage}
        </Text>
      </Snackbar>
    </View>
  );
}