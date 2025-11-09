import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates';
import { DataTable } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';
import { AdminSummary, Category, createVerseOfDay, deleteVerseOfDay, getAllUsers, getUpcomingVerseOfDay, sendNotificationToAll, getAllReports, ReportItem, deleteReport, makeUserAdmin, removeUserAdmin, deleteUser, getAllCategories, createCategory, deleteCategory, getSiteBanner, updateSiteBanner, deleteSiteBanner, getAdmins } from './db';
import { formatDate as formatDateUtil } from './dateUtils';

type VerseOfDayQueueItem = {
  id: number;
  readableReference: string;
  versedDate: string;
};

export default function AdminScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUserStore = useAppStore((state) => state.setUser);
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<AdminSummary[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [verseOfDayReference, setVerseOfDayReference] = useState('');
  const [verseOfDayDate, setVerseOfDayDate] = useState<Date>(new Date());
  const [showVerseOfDayDatePicker, setShowVerseOfDayDatePicker] = useState(false);
  const [verseOfDays, setVerseOfDays] = useState<VerseOfDayQueueItem[]>([]);
  const [loadingVerseOfDays, setLoadingVerseOfDays] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinDialogAction, setPinDialogAction] = useState<'sendNotification' | 'makeAdmin' | 'removeAdmin' | 'deleteUser' | 'saveBanner' | 'deleteBanner'>('sendNotification');
  const [pinDialogTargetUser, setPinDialogTargetUser] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [loadingBanner, setLoadingBanner] = useState(false);
  const [pendingBannerMessage, setPendingBannerMessage] = useState<string | null>(null);
  const siteBanner = useAppStore((state) => state.siteBanner);
  const setSiteBanner = useAppStore((state) => state.setSiteBanner);

  const formattedSelectedVerseDate = useMemo(
    () => formatDateUtil(verseOfDayDate.toISOString()),
    [verseOfDayDate]
  );

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
      const normalized: VerseOfDayQueueItem[] = Array.isArray(data) ? data : [];
      normalized.sort((a, b) => {
        const aTime = new Date(a.versedDate).getTime();
        const bTime = new Date(b.versedDate).getTime();
        return aTime - bTime;
      });
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
    } else if (pinDialogAction === 'deleteUser') {
      setLoading(true);
      try {
        await deleteUser(pinDialogTargetUser);
        await loadAdmins();
        await loadUsers();
        alert(`${pinDialogTargetUser}'s account has been deleted.`);
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user');
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
    }
  };

  const handleCreateVerseOfDay = async () => {
    if (!verseOfDayReference.trim()) {
      alert('Please enter a verse reference');
      return;
    }

    setLoading(true);
    try {
      await createVerseOfDay(verseOfDayReference, user.username, verseOfDayDate);
      setVerseOfDayReference('');
      setVerseOfDayDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 1);
        return next;
      });
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

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoadingCategories(false);
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

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      loadAdmins();
      loadVerseOfDays();
      loadReports();
      loadCategories();
      loadBanner();
    }, [loadAdmins, loadBanner, loadCategories, loadReports, loadUsers, loadVerseOfDays])
  );

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      alert('Please enter a category name');
      return;
    }
    try {
      await createCategory(name);
      setNewCategoryName('');
      await loadCategories();
      alert('Category created');
    } catch (e) {
      alert('Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteCategory(id);
      await loadCategories();
    } catch (e) {
      alert('Failed to delete category');
    }
  };

registerTranslation('en', en);
  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return formatDateUtil(dateString);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>

          {/* Admins Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              All Admins
            </Text>
            
            {loadingAdmins ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Username</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Name</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Email</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 100 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Action</Text></DataTable.Title>
                  </DataTable.Header>

                  {admins.map((adminItem, index) => {
                    const matchingUser = users.find((u) => u.username === adminItem.username);
                    const fullName = matchingUser ? `${matchingUser.firstName ?? ''} ${matchingUser.lastName ?? ''}`.trim() : '';
                    const email = adminItem.email ?? matchingUser?.email ?? '—';
                    return (
                    <DataTable.Row key={adminItem.username}>
                      <DataTable.Cell style={{ minWidth: 150 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{adminItem.username}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 150 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>
                          {fullName.length > 0 ? fullName : '—'}
                        </Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 200 }}>
                        <Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{email}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 100 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setPinDialogAction('removeAdmin');
                            setPinDialogTargetUser(adminItem.username);
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
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </DataTable.Cell>
                    </DataTable.Row>
                  )})}
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
                        <View style={{ flexDirection: 'row', gap: 8 }}>
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
                          <TouchableOpacity
                            onPress={() => {
                              setPinDialogAction('deleteUser');
                              setPinDialogTargetUser(userItem.username);
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
                              Delete
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

          {/* Verse of Day Section */}
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
              onPress={() => setShowVerseOfDayDatePicker(true)}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: theme.colors.outline,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Text style={{ color: theme.colors.onBackground, fontSize: 16, fontFamily: 'Inter' }}>
                {formattedSelectedVerseDate}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.onBackground} />
            </TouchableOpacity>

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

            <ScrollView horizontal style={{ marginTop: 10 }}>
              <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                <DataTable.Header>
                  <DataTable.Title style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>ID</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 180 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Reference</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Verse Date</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Action</Text></DataTable.Title>
                </DataTable.Header>

                {verseOfDays.map((vod) => (
                  <DataTable.Row key={vod.id}>
                    <DataTable.Cell style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{vod.id}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ minWidth: 180 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{vod.readableReference}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ minWidth: 160 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{formatDate(vod.versedDate)}</Text></DataTable.Cell>
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

        <DatePickerModal
          locale="en"
          mode="single"
          visible={showVerseOfDayDatePicker}
          date={verseOfDayDate}
          onDismiss={() => setShowVerseOfDayDatePicker(false)}
          validRange={{ startDate: new Date() }}
          label="Select Verse Date"
          saveLabel="Save"
          onConfirm={({ date }: { date?: Date }) => {
            if (date) {
              const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
              setVerseOfDayDate(normalized);
            }
            setShowVerseOfDayDatePicker(false);
          }}
        />

          {/* Categories Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 10, fontFamily: 'Inter' }}>
              Categories
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  color: theme.colors.onBackground,
                  fontSize: 16
                }}
                placeholder="New category name"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity
                style={styles.button_filled}
                onPress={handleAddCategory}
                disabled={loadingCategories}
              >
                {loadingCategories ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText_filled}>Add</Text>
                )}
              </TouchableOpacity>
            </View>

            {loadingCategories ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                <DataTable style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}>
                  <DataTable.Header>
                    <DataTable.Title style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>ID</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Name</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 120 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Action</Text></DataTable.Title>
                  </DataTable.Header>

                  {categories.map((c) => (
                    <DataTable.Row key={c.categoryId}>
                      <DataTable.Cell style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{c.categoryId}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{c.name}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 120 }}>
                        <TouchableOpacity
                          onPress={() => handleDeleteCategory(c.categoryId)}
                          style={{
                            padding: 6,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: 'red'
                          }}
                        >
                          <Text style={{ color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                        </TouchableOpacity>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>
            )}
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
               'Delete User'}
            </Text>
            
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
              autoFocus
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
