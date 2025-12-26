import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DataTable } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';
import { AdminSummary, createVerseOfDay, deleteVerseOfDay, getAllUsers, getUpcomingVerseOfDay, sendNotificationToAll, getAllReports, ReportItem, deleteReport, makeUserAdmin, removeUserAdmin, deleteUser, banUser, getSiteBanner, updateSiteBanner, deleteSiteBanner, getAdmins, resetVerseOfDayQueue, getUnapprovedNotes, approveNote, denyNote, VerseNote, getVerseOfDaySuggestions, approveVerseOfDaySuggestion, deleteVerseOfDaySuggestion, VerseOfDaySuggestion, getPendingCollections, approveCollection, rejectCollection, PublishedCollection, makeUserPaid, removeUserPaid, getPaidUsers } from './db';
import { formatDate as formatDateUtil } from './dateUtils';

type VerseOfDayQueueItem = {
  id: number;
  readableReference: string;
  sequence: number;
  isCurrent: boolean;
};

export default function AdminScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUserStore = useAppStore((state) => state.setUser);
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<AdminSummary[]>([]);
  const [paidUsers, setPaidUsers] = useState<AdminSummary[]>([]);
  const [loadingPaidUsers, setLoadingPaidUsers] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [verseOfDayReference, setVerseOfDayReference] = useState('');
  const [verseOfDays, setVerseOfDays] = useState<VerseOfDayQueueItem[]>([]);
  const [loadingVerseOfDays, setLoadingVerseOfDays] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [unapprovedNotes, setUnapprovedNotes] = useState<VerseNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyNoteId, setDenyNoteId] = useState<number | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [suggestions, setSuggestions] = useState<VerseOfDaySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [pendingCollections, setPendingCollections] = useState<PublishedCollection[]>([]);
  const [loadingPendingCollections, setLoadingPendingCollections] = useState(false);
  const [showRejectCollectionModal, setShowRejectCollectionModal] = useState(false);
  const [rejectCollectionId, setRejectCollectionId] = useState<number | null>(null);
  const [rejectCollectionReason, setRejectCollectionReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinDialogAction, setPinDialogAction] = useState<'sendNotification' | 'makeAdmin' | 'removeAdmin' | 'banUser' | 'saveBanner' | 'deleteBanner' | 'makePaidUser' | 'removePaidUser'>('sendNotification');
  const [banReason, setBanReason] = useState('');
  const [banExpireDate, setBanExpireDate] = useState('');
  const [pinDialogTargetUser, setPinDialogTargetUser] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [loadingBanner, setLoadingBanner] = useState(false);
  const [pendingBannerMessage, setPendingBannerMessage] = useState<string | null>(null);
  const siteBanner = useAppStore((state) => state.siteBanner);
  const setSiteBanner = useAppStore((state) => state.setSiteBanner);


  const syncCurrentUserAdminFlag = useCallback((adminList: AdminSummary[]) => {
    if (!user?.username) {
      return;
    }

    const isAdminNow = adminList.some((admin) => admin?.username === user.username);
    if (user.isAdmin !== isAdminNow) {
      setUserStore({ ...user, isAdmin: isAdminNow });
    }
  }, [setUserStore, user]);

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const data = await getAdmins();
      setAdmins(data);
      syncCurrentUserAdminFlag(data);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoadingAdmins(false);
    }
  }, [syncCurrentUserAdminFlag]);

  const loadPaidUsers = useCallback(async () => {
    setLoadingPaidUsers(true);
    try {
      const data = await getPaidUsers();
      setPaidUsers(data);
    } catch (error) {
      console.error('Failed to load paid users:', error);
    } finally {
      setLoadingPaidUsers(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await getAllUsers(searchText || undefined);
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [searchText]);

  const loadVerseOfDays = useCallback(async () => {
    setLoadingVerseOfDays(true);
    try {
      const data = await getUpcomingVerseOfDay();
      const normalized: VerseOfDayQueueItem[] = Array.isArray(data)
        ? data.map((item: any) => ({
            id: item.id,
            readableReference: item.readableReference,
            sequence: item.sequence ?? 0,
            isCurrent: item.isCurrent ?? false
          }))
        : [];

      // Already sorted by sequence from server
      setVerseOfDays(normalized);
    } catch (error) {
      console.error('Failed to load verse of days:', error);
    } finally {
      setLoadingVerseOfDays(false);
    }
  }, []);

  const handleDeleteVerseOfDay = async (id: number) => {
    try {
      await deleteVerseOfDay(id, user.username);
      await loadVerseOfDays();
      alert('Verse of the day removed from queue');
    } catch (error) {
      console.error('Failed to delete verse of day:', error);
      alert('Failed to delete verse of day');
    }
  };

  const handleSendNotification = async () => {
    if (!notificationMessage.trim()) {
      alert('Please enter a notification message');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmSendNotification = async () => {
    setShowConfirmDialog(false);
    setPinDialogAction('sendNotification');
    setShowPinDialog(true);
  };

  const handlePinSubmit = async () => {
    if (pinInput !== '3151') {
      alert('Incorrect PIN');
      setPinInput('');
      return;
    }

    const currentPin = pinInput;
    setShowPinDialog(false);
    setPinInput('');
    
    if (pinDialogAction === 'sendNotification') {
      setLoading(true);
      try {
        await sendNotificationToAll(notificationMessage, user.username);
        setNotificationMessage('');
        alert('Notification sent to all users');
      } catch (error) {
        console.error('Failed to send notification:', error);
        alert('Failed to send notification');
      } finally {
        setLoading(false);
      }
    } else if (pinDialogAction === 'makeAdmin') {
      setLoading(true);
      try {
        await makeUserAdmin(pinDialogTargetUser);
        await loadAdmins();
        await loadUsers();
      } catch (error) {
        console.error('Failed to make user admin:', error);
        alert('Failed to make user admin');
      } finally {
        setLoading(false);
      }
    } else if (pinDialogAction === 'removeAdmin') {
      setLoading(true);
      try {
        await removeUserAdmin(pinDialogTargetUser);
        await loadAdmins();
        await loadUsers();
      } catch (error) {
        console.error('Failed to remove admin:', error);
        alert('Failed to remove admin');
      } finally {
        setLoading(false);
      }
    } else if (pinDialogAction === 'banUser') {
      setLoading(true);
      try {
        await banUser(pinDialogTargetUser, user.username, banReason || undefined, banExpireDate || undefined);
        await loadAdmins();
        await loadUsers();
        setBanReason('');
        setBanExpireDate('');
        alert(`${pinDialogTargetUser} has been banned.`);
      } catch (error) {
        console.error('Failed to ban user:', error);
        alert('Failed to ban user');
      } finally {
        setLoading(false);
      }
    } else if (pinDialogAction === 'saveBanner') {
      if (!pendingBannerMessage || !pendingBannerMessage.trim()) {
        alert('Banner message cannot be empty');
        return;
      }
      setLoadingBanner(true);
      try {
        const result = await updateSiteBanner(pendingBannerMessage.trim(), user.username, currentPin);
        const normalizedMessage = result.hasBanner && result.message ? result.message.trim() : '';
        setBannerMessage(normalizedMessage);
        setSiteBanner({ message: normalizedMessage.length > 0 ? normalizedMessage : null });
        alert('Banner updated');
      } catch (error) {
        console.error('Failed to update banner:', error);
        alert('Failed to update banner');
      } finally {
        setPendingBannerMessage(null);
        setLoadingBanner(false);
      }
    } else if (pinDialogAction === 'deleteBanner') {
      setLoadingBanner(true);
      try {
        await deleteSiteBanner(user.username, currentPin);
        setBannerMessage('');
        setSiteBanner({ message: null });
        alert('Banner removed');
      } catch (error) {
        console.error('Failed to delete banner:', error);
        alert('Failed to delete banner');
      } finally {
        setPendingBannerMessage(null);
        setLoadingBanner(false);
      }
    } else if (pinDialogAction === 'makePaidUser') {
      setLoading(true);
      try {
        await makeUserPaid(pinDialogTargetUser, user.username, currentPin);
        await loadPaidUsers();
        await loadUsers();
        alert(`${pinDialogTargetUser} is now a paid user`);
      } catch (error) {
        console.error('Failed to make user paid:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to make user paid';
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    } else if (pinDialogAction === 'removePaidUser') {
      setLoading(true);
      try {
        await removeUserPaid(pinDialogTargetUser, user.username, currentPin);
        await loadPaidUsers();
        await loadUsers();
        alert(`Paid status removed from ${pinDialogTargetUser}`);
      } catch (error) {
        console.error('Failed to remove paid status:', error);
        alert('Failed to remove paid status');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateVerseOfDay = async () => {
    const trimmedReference = verseOfDayReference.trim();
    if (!trimmedReference) {
      alert('Please enter a verse reference');
      return;
    }

    setLoading(true);
    try {
      await createVerseOfDay(trimmedReference, user.username);
      setVerseOfDayReference('');
      await loadVerseOfDays();
      alert('Verse of the day added to queue!');
    } catch (error: any) {
      console.error('Failed to create verse of day:', error);
      const errorMessage = error?.message || 'Failed to create verse of day. Please check the verse reference format (e.g., "John 3:16").';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetVerseQueue = async () => {
    setLoading(true);
    try {
      const result = await resetVerseOfDayQueue(user.username);
      await loadVerseOfDays();
      const message = result?.message || 'Verse of the day queue reset to the beginning.';
      alert(message);
    } catch (error: any) {
      console.error('Failed to reset verse of day queue:', error);
      const message = error?.message || 'Failed to reset verse of day queue.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSaveBanner = () => {
    const trimmed = bannerMessage.trim();
    if (!trimmed) {
      alert('Please enter a banner message');
      return;
    }
    setPendingBannerMessage(trimmed);
    setPinDialogAction('saveBanner');
    setShowPinDialog(true);
  };

  const handleRequestRemoveBanner = () => {
    if (!siteBanner.message) {
      alert('There is no active banner to remove.');
      return;
    }
    setPendingBannerMessage(null);
    setPinDialogAction('deleteBanner');
    setShowPinDialog(true);
  };

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await getAllReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const loadBanner = useCallback(async () => {
    setLoadingBanner(true);
    try {
      const data = await getSiteBanner();
      const normalizedMessage = data.hasBanner && data.message ? data.message.trim() : '';
      setBannerMessage(normalizedMessage);
      setSiteBanner({ message: normalizedMessage.length > 0 ? normalizedMessage : null });
    } catch (error) {
      console.error('Failed to load banner:', error);
    } finally {
      setLoadingBanner(false);
    }
  }, [setSiteBanner]);

  const loadUnapprovedNotes = useCallback(async () => {
    if (!user?.username) return;
    setLoadingNotes(true);
    try {
      const data = await getUnapprovedNotes(user.username);
      setUnapprovedNotes(data);
    } catch (error) {
      console.error('Failed to load unapproved notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  }, [user?.username]);

  const loadSuggestions = useCallback(async () => {
    if (!user?.username) return;
    setLoadingSuggestions(true);
    try {
      const data = await getVerseOfDaySuggestions(user.username);
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [user?.username]);

  const loadPendingCollections = useCallback(async () => {
    if (!user?.username) return;
    setLoadingPendingCollections(true);
    try {
      const data = await getPendingCollections(user.username);
      setPendingCollections(data);
    } catch (error) {
      console.error('Failed to load pending collections:', error);
    } finally {
      setLoadingPendingCollections(false);
    }
  }, [user?.username]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      loadAdmins();
      loadPaidUsers();
      loadVerseOfDays();
      loadReports();
      loadBanner();
      loadUnapprovedNotes();
      loadSuggestions();
      loadPendingCollections();
    }, [loadAdmins, loadBanner, loadReports, loadUsers, loadVerseOfDays, loadUnapprovedNotes, loadSuggestions, loadPendingCollections, loadPaidUsers])
  );

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return formatDateUtil(dateString);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>

          {/* Unapproved Notes Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Unapproved Notes
            </Text>

            {loadingNotes ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Verse</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 300 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Text</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>User</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Date</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Actions</Text></DataTable.Title>
                  </DataTable.Header>

                  {unapprovedNotes.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={{ minWidth: 1010 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>No unapproved notes</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    unapprovedNotes.map((note) => (
                      <DataTable.Row key={note.id}>
                        <DataTable.Cell style={{ minWidth: 200 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{note.verseReference}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 300 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }} numberOfLines={2}>
                            {note.text}
                          </Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 150 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{note.username}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 140 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{formatDate(note.createdDate)}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 220 }}>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              onPress={async () => {
                                if (!user?.username) return;
                                try {
                                  await approveNote(note.id, user.username);
                                  await loadUnapprovedNotes();
                                  alert('Note approved');
                                } catch (error) {
                                  console.error('Failed to approve note:', error);
                                  alert('Failed to approve note');
                                }
                              }}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: 'green'
                              }}
                            >
                              <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                                Approve
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                setDenyNoteId(note.id);
                                setDenyReason('');
                                setShowDenyModal(true);
                              }}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: 'red'
                              }}
                            >
                              <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                                Deny
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>
            )}
          </View>

          {/* Pending Collections Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Collections Needing Review
            </Text>

            {loadingPendingCollections ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Title</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Author</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 250 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Description</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Date</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 280 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Actions</Text></DataTable.Title>
                  </DataTable.Header>

                  {pendingCollections.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={{ minWidth: 960 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>No collections pending review</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    pendingCollections.map((collection) => (
                      <DataTable.Row key={collection.publishedId}>
                        <DataTable.Cell style={{ minWidth: 200 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{collection.title}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 150 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{collection.author}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 250 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }} numberOfLines={2}>
                            {collection.description || 'No description'}
                          </Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 140 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{formatDate(typeof collection.publishedDate === 'string' ? collection.publishedDate : collection.publishedDate.toISOString())}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 280 }}>
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <TouchableOpacity
                              onPress={async () => {
                                if (!collection.publishedId) return;
                                router.push(`/explore/collection/${collection.publishedId}`);
                              }}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: theme.colors.primary
                              }}
                            >
                              <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                                View
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={async () => {
                                if (!user?.username) return;
                                try {
                                  await approveCollection(collection.publishedId, user.username);
                                  await loadPendingCollections();
                                  alert('Collection approved and published');
                                } catch (error) {
                                  console.error('Failed to approve collection:', error);
                                  alert('Failed to approve collection');
                                }
                              }}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: 'green'
                              }}
                            >
                              <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                                Approve
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                setRejectCollectionId(collection.publishedId);
                                setRejectCollectionReason('');
                                setShowRejectCollectionModal(true);
                              }}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: 'red'
                              }}
                            >
                              <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                                Reject
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>
            )}
          </View>

          {/* Verse of Day Suggestions Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Verse of Day Suggestions
            </Text>

            {loadingSuggestions ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 250 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Reference</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Suggested By</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Date</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 100 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Status</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Actions</Text></DataTable.Title>
                  </DataTable.Header>

                  {suggestions.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={{ minWidth: 860 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>No suggestions</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    suggestions.map((suggestion) => (
                      <DataTable.Row key={suggestion.id}>
                        <DataTable.Cell style={{ minWidth: 250 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{suggestion.readableReference}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 150 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{suggestion.suggesterUsername}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 140 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{formatDate(suggestion.createdDate)}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 100 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{suggestion.status}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 220 }}>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {suggestion.status === 'PENDING' && (
                              <TouchableOpacity
                                onPress={async () => {
                                  if (!user?.username) return;
                                  try {
                                    await approveVerseOfDaySuggestion(suggestion.id, user.username);
                                    await loadSuggestions();
                                    await loadVerseOfDays();
                                    alert('Suggestion approved and added to queue');
                                  } catch (error) {
                                    console.error('Failed to approve suggestion:', error);
                                    alert(error instanceof Error ? error.message : 'Failed to approve suggestion');
                                  }
                                }}
                                style={{
                                  padding: 6,
                                  paddingHorizontal: 12,
                                  borderRadius: 8,
                                  backgroundColor: 'green'
                                }}
                              >
                                <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                                  Add
                                </Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={async () => {
                                if (!user?.username) return;
                                try {
                                  await deleteVerseOfDaySuggestion(suggestion.id, user.username);
                                  await loadSuggestions();
                                  alert('Suggestion deleted');
                                } catch (error) {
                                  console.error('Failed to delete suggestion:', error);
                                  alert('Failed to delete suggestion');
                                }
                              }}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: 'red'
                              }}
                            >
                              <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                                Delete
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>
            )}
          </View>

          {/* Bug Reports Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Bug Reports
            </Text>

            {loadingReports ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Reporter</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 300 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Issue</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Date</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 100 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Action</Text></DataTable.Title>
                  </DataTable.Header>

                  {reports.filter(r => r.reported_Username === 'SYSTEM').map((r) => (
                    <DataTable.Row key={r.report_Id}>
                      <DataTable.Cell style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{r.reporter_Username}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 300 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{r.reported_Email || 'N/A'}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{formatDate(r.created_Date)}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 100 }}>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              await deleteReport(r.report_Id);
                              await loadReports();
                            } catch (error) {
                              console.error('Failed to delete report:', error);
                              alert('Failed to delete report');
                            }
                          }}
                          style={{
                            padding: 6,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: 'red'
                          }}
                        >
                          <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>
            )}
          </View>

          {/* Site Banner Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Site Banner
            </Text>

            <TextInput
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                color: theme.colors.onBackground,
                fontSize: 16,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Enter banner message to show on the home page..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={bannerMessage}
              onChangeText={setBannerMessage}
              multiline
              editable={!loadingBanner}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.button_filled, { flex: 1, opacity: loadingBanner ? 0.6 : 1 }]}
                onPress={handleRequestSaveBanner}
                disabled={loadingBanner}
              >
                {loadingBanner && pinDialogAction === 'saveBanner' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText_filled}>Save Banner</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button_filled,
                  {
                    flex: 1,
                    backgroundColor: 'red',
                    opacity: loadingBanner || !siteBanner.message ? 0.6 : 1,
                  },
                ]}
                onPress={handleRequestRemoveBanner}
                disabled={loadingBanner || !siteBanner.message}
              >
                {loadingBanner && pinDialogAction === 'deleteBanner' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText_filled}>Remove Banner</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text
              style={{
                marginTop: 8,
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                fontSize: 14,
              }}
            >
              {siteBanner.message
                ? 'A banner is currently visible to all users.'
                : 'No banner is currently visible.'}
            </Text>
          </View>

          {/* Users Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              All Users
            </Text>
            
            <TextInput
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                color: theme.colors.onBackground,
                fontSize: 16
              }}
              placeholder="Search users..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={loadUsers}
            />

            <TouchableOpacity
              style={styles.button_filled}
              onPress={loadUsers}
              disabled={loadingUsers}
            >
              {loadingUsers ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText_filled}>Search</Text>
              )}
            </TouchableOpacity>

            {loadingUsers ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Username</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Name</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Email</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Actions</Text></DataTable.Title>
                  </DataTable.Header>

                  {users.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map((userItem, index) => (
                    <DataTable.Row key={index}>
                      <DataTable.Cell style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{userItem.username}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{userItem.firstName} {userItem.lastName}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{userItem.email}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 200 }}>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          {!admins.some((admin) => admin.username === userItem.username) && (
                            <TouchableOpacity
                              onPress={() => {
                                setPinDialogAction('makeAdmin');
                                setPinDialogTargetUser(userItem.username);
                                setShowPinDialog(true);
                              }}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: theme.colors.primary
                              }}
                            >
                              <Text style={{
                                color: 'white',
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: '600'
                              }}>
                                Make Admin
                              </Text>
                            </TouchableOpacity>
                          )}
                          {!paidUsers.some((paid) => paid.username === userItem.username) && (
                            <TouchableOpacity
                              onPress={() => {
                                setPinDialogAction('makePaidUser');
                                setPinDialogTargetUser(userItem.username);
                                setShowPinDialog(true);
                              }}
                              style={{
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: 'green'
                              }}
                            >
                              <Text style={{
                                color: 'white',
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: '600'
                              }}>
                                Make Paid
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              setPinDialogAction('banUser');
                              setPinDialogTargetUser(userItem.username);
                              setBanReason('');
                              setBanExpireDate('');
                              setShowPinDialog(true);
                            }}
                            style={{
                              padding: 6,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: 'red'
                            }}
                          >
                            <Text style={{
                              color: 'white',
                              fontFamily: 'Inter',
                              fontSize: 12,
                              fontWeight: '600'
                            }}>
                              Ban
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}

                  <DataTable.Pagination
                    page={page}
                    numberOfPages={Math.ceil(users.length / itemsPerPage)}
                    onPageChange={(newPage) => setPage(newPage)}
                    label={`${page * itemsPerPage + 1}-${Math.min((page + 1) * itemsPerPage, users.length)} of ${users.length}`}
                  />
                </DataTable>
              </ScrollView>
            )}
          </View>

          {/* Send Notification Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Send Notification to All Users
            </Text>
            
            <TextInput
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                color: theme.colors.onBackground,
                fontSize: 16,
                height: 100,
                textAlignVertical: 'top'
              }}
              placeholder="Enter notification message..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={notificationMessage}
              onChangeText={setNotificationMessage}
              multiline
            />

            <TouchableOpacity
              style={styles.button_filled}
              onPress={handleSendNotification}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText_filled}>Send Notification</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Verse of Day Queue Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Verse of the Day Queue
            </Text>

            <TextInput
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                color: theme.colors.onBackground,
                fontSize: 16
              }}
              placeholder="e.g., John 3:16"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={verseOfDayReference}
              onChangeText={setVerseOfDayReference}
            />

            <TouchableOpacity
              style={{...styles.button_filled}}
              onPress={handleCreateVerseOfDay}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{...styles.buttonText_filled}}>Add to Queue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ ...styles.button_outlined, marginTop: 10 }}
              onPress={handleResetVerseQueue}
              disabled={loading || loadingVerseOfDays}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Text style={{ ...styles.buttonText_outlined }}>Reset Queue to Beginning</Text>
              )}
            </TouchableOpacity>

            <ScrollView horizontal style={{ marginTop: 10 }}>
              <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                <DataTable.Header>
                  <DataTable.Title style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>ID</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 180 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Reference</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 100 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Sequence</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 100 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Current</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Action</Text></DataTable.Title>
                </DataTable.Header>

                {verseOfDays.map((vod) => (
                  <DataTable.Row key={vod.id}>
                    <DataTable.Cell style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{vod.id}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ minWidth: 180 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{vod.readableReference}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ minWidth: 100 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{vod.sequence}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ minWidth: 100 }}>
                      <Text style={{ 
                        color: vod.isCurrent ? theme.colors.primary : theme.colors.onBackground, 
                        fontFamily: 'Inter',
                        fontWeight: vod.isCurrent ? 'bold' : 'normal'
                      }}>
                        {vod.isCurrent ? 'Yes' : '—'}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell style={{ minWidth: 80 }}>
                      <TouchableOpacity
                        onPress={() => handleDeleteVerseOfDay(vod.id)}
                        disabled={loadingVerseOfDays}
                        style={{
                          padding: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: 'red'
                        }}
                      >
                        <Text style={{
                          color: 'white',
                          fontFamily: 'Inter',
                          fontSize: 12,
                          fontWeight: '600'
                        }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </ScrollView>
          </View>
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Bug Reports
            </Text>

            {loadingReports ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Reporter</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 300 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Issue</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Date</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 100 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Action</Text></DataTable.Title>
                  </DataTable.Header>

                  {reports.filter(r => r.reported_Username === 'SYSTEM').map((r) => (
                    <DataTable.Row key={r.report_Id}>
                      <DataTable.Cell style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{r.reporter_Username}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 300 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{r.reported_Email || 'N/A'}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{formatDate(r.created_Date)}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 100 }}>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              await deleteReport(r.report_Id);
                              await loadReports();
                            } catch (error) {
                              console.error('Failed to delete report:', error);
                              alert('Failed to delete report');
                            }
                          }}
                          style={{
                            padding: 6,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: 'red'
                          }}
                        >
                          <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>
            )}
          </View>

          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Reported Users
            </Text>

            {loadingReports ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Reported</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Email</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Reporter</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Date</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Actions</Text></DataTable.Title>
                  </DataTable.Header>

                  {reports.filter(r => r.reported_Username !== 'SYSTEM').map((r) => (
                    <DataTable.Row key={r.report_Id}>
                      <DataTable.Cell style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{r.reported_Username}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{r.reported_Email}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{r.reporter_Username}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{formatDate(r.created_Date)}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 220 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => router.push(`/user/${r.reported_Username}`)}
                            style={{
                              padding: 6,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: theme.colors.primary
                            }}
                          >
                            <Text style={{ color: theme.colors.onPrimary, fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                              View Profile
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={async () => {
                              try {
                                await deleteReport(r.report_Id);
                                await loadReports();
                              } catch (error) {
                                console.error('Failed to delete report:', error);
                                alert('Failed to delete report');
                              }
                            }}
                            style={{
                              padding: 6,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: 'red'
                            }}
                          >
                            <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>
            )}
          </View>

        </View>

          {/* Paid Users Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Paid Users
            </Text>

            {loadingPaidUsers ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header style={{ backgroundColor: theme.colors.background }}>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Username</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Email</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Actions</Text></DataTable.Title>
                  </DataTable.Header>

                  {paidUsers.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={{ minWidth: 550 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>No paid users found</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    paidUsers.map((paidUser) => (
                      <DataTable.Row key={paidUser.username}>
                        <DataTable.Cell style={{ minWidth: 150 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{paidUser.username}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 200 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{paidUser.email || 'N/A'}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 200 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setPinDialogAction('removePaidUser');
                              setPinDialogTargetUser(paidUser.username);
                              setShowPinDialog(true);
                            }}
                            style={{
                              padding: 6,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: 'red'
                            }}
                          >
                            <Text style={{
                              color: 'white',
                              fontFamily: 'Inter',
                              fontSize: 12,
                              fontWeight: '600'
                            }}>
                              Remove Paid
                            </Text>
                          </TouchableOpacity>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>
            )}
          </View>

          {/* All Admins Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              All Admins
            </Text>

            {loadingAdmins ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Username</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Email</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Actions</Text></DataTable.Title>
                  </DataTable.Header>

                  {admins.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={{ minWidth: 550 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>No admins found</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    admins.map((admin) => (
                      <DataTable.Row key={admin.username}>
                        <DataTable.Cell style={{ minWidth: 150 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>@{admin.username}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 200 }}>
                          <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{admin.email || 'N/A'}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ minWidth: 200 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setPinDialogAction('removeAdmin');
                              setPinDialogTargetUser(admin.username);
                              setShowPinDialog(true);
                            }}
                            style={{
                              padding: 6,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: 'red'
                            }}
                          >
                            <Text style={{
                              color: 'white',
                              fontFamily: 'Inter',
                              fontSize: 12,
                              fontWeight: '600'
                            }}>
                              Remove Admin
                            </Text>
                          </TouchableOpacity>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>
            )}
          </View>

          {/* Categories Management Button */}
          <View style={{ marginBottom: 30 }}>
            <TouchableOpacity
              style={styles.button_filled}
              onPress={() => router.push('/admin/categories')}
            >
              <Text style={styles.buttonText_filled}>Manage Categories</Text>
            </TouchableOpacity>
          </View>


      {/* Confirmation Dialog */}
      <Modal
        visible={showConfirmDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Confirm Send Notification
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 8,
              fontFamily: 'Inter'
            }}>
              Are you sure you want to send this notification:
            </Text>
            
            <View style={{
              backgroundColor: theme.colors.background,
              borderRadius: 12,
              padding: 12,
              marginBottom: 20
            }}>
              <Text style={{
                fontSize: 14,
                color: theme.colors.onBackground,
                fontFamily: 'Inter',
                lineHeight: 20
              }}>
                "{notificationMessage}"
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowConfirmDialog(false)}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSendNotification}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary
                }}
              >
                <Text style={{
                  color: theme.colors.onPrimary,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deny Note Modal */}
      <Modal
        visible={showDenyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDenyModal(false);
          setDenyNoteId(null);
          setDenyReason('');
        }}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Deny Note
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Please provide a reason for denying this note:
            </Text>
            
            <TextInput
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
                color: theme.colors.onBackground,
                fontSize: 16,
                fontFamily: 'Inter',
                minHeight: 100,
                textAlignVertical: 'top'
              }}
              placeholder="Enter reason..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={denyReason}
              onChangeText={setDenyReason}
              multiline
              numberOfLines={4}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowDenyModal(false);
                  setDenyNoteId(null);
                  setDenyReason('');
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!denyNoteId || !user?.username) return;
                  try {
                    await denyNote(denyNoteId, user.username, denyReason);
                    await loadUnapprovedNotes();
                    setShowDenyModal(false);
                    setDenyNoteId(null);
                    setDenyReason('');
                    alert('Note denied and user notified');
                  } catch (error) {
                    console.error('Failed to deny note:', error);
                    alert('Failed to deny note');
                  }
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: 'red'
                }}
              >
                <Text style={{
                  color: 'white',
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Deny
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Collection Modal */}
      <Modal
        visible={showRejectCollectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowRejectCollectionModal(false);
          setRejectCollectionId(null);
          setRejectCollectionReason('');
        }}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Reject Collection
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Please provide a reason for rejecting this collection (optional):
            </Text>
            
            <TextInput
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
                color: theme.colors.onBackground,
                fontSize: 16,
                fontFamily: 'Inter',
                minHeight: 100,
                textAlignVertical: 'top'
              }}
              placeholder="Enter reason (optional)..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={rejectCollectionReason}
              onChangeText={setRejectCollectionReason}
              multiline
              numberOfLines={4}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectCollectionModal(false);
                  setRejectCollectionId(null);
                  setRejectCollectionReason('');
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!rejectCollectionId || !user?.username) return;
                  try {
                    await rejectCollection(rejectCollectionId, user.username, rejectCollectionReason || undefined);
                    await loadPendingCollections();
                    setShowRejectCollectionModal(false);
                    setRejectCollectionId(null);
                    setRejectCollectionReason('');
                    alert('Collection rejected and user notified');
                  } catch (error) {
                    console.error('Failed to reject collection:', error);
                    alert('Failed to reject collection');
                  }
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: 'red'
                }}
              >
                <Text style={{
                  color: 'white',
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPinDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPinDialog(false);
          setPinInput('');
        }}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              {pinDialogAction === 'sendNotification' ? 'Send Notification' : 
               pinDialogAction === 'makeAdmin' ? 'Make Admin' : 
               pinDialogAction === 'removeAdmin' ? 'Remove Admin' : 
               pinDialogAction === 'makePaidUser' ? 'Make Paid User' :
               pinDialogAction === 'removePaidUser' ? 'Remove Paid Status' :
               'Ban User'}
            </Text>
            
            {pinDialogAction === 'banUser' && (
              <>
                <Text style={{
                  fontSize: 16,
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 8,
                  fontFamily: 'Inter'
                }}>
                  Ban Reason (optional):
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    color: theme.colors.onBackground,
                    fontSize: 16,
                    fontFamily: 'Inter'
                  }}
                  placeholder="Enter ban reason"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  value={banReason}
                  onChangeText={setBanReason}
                  multiline
                  numberOfLines={3}
                />
                <Text style={{
                  fontSize: 16,
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 8,
                  fontFamily: 'Inter'
                }}>
                  Ban Expire Date (optional, leave empty for permanent):
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    color: theme.colors.onBackground,
                    fontSize: 16,
                    fontFamily: 'Inter'
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  value={banExpireDate}
                  onChangeText={setBanExpireDate}
                />
              </>
            )}
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Please enter the owner PIN:
            </Text>
            
            <TextInput
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
                color: theme.colors.onBackground,
                fontSize: 18,
                fontFamily: 'Inter',
                letterSpacing: 8,
                textAlign: 'center'
              }}
              placeholder="PIN"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              autoFocus={pinDialogAction !== 'banUser'}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowPinDialog(false);
                  setPinInput('');
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePinSubmit}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary
                }}
              >
                <Text style={{
                  color: theme.colors.onPrimary,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
      <View style={{ height: 60 }} />
    </View>
  );
}
