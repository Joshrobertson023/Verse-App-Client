import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DataTable } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';
import { createVerseOfDay, deleteVerseOfDay, getAllUsers, getUpcomingVerseOfDay, sendNotificationToAll, getAllReports, ReportItem, deleteReport, makeUserAdmin, removeUserAdmin, deleteUser, getAllCategories, createCategory, deleteCategory } from './db';
import { formatDate as formatDateUtil } from './dateUtils';

export default function AdminScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const [users, setUsers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [verseOfDayReference, setVerseOfDayReference] = useState('');
  const [verseOfDays, setVerseOfDays] = useState<any[]>([]);
  const [loadingVerseOfDays, setLoadingVerseOfDays] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [categories, setCategories] = useState<{ category_Id: number; name: string }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinDialogAction, setPinDialogAction] = useState<'sendNotification' | 'makeAdmin' | 'removeAdmin' | 'deleteUser'>('sendNotification');
  const [pinDialogTargetUser, setPinDialogTargetUser] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      loadVerseOfDays();
      loadReports();
      loadCategories();
    }, [])
  );

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getAllUsers(searchText || undefined);
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadVerseOfDays = async () => {
    setLoadingVerseOfDays(true);
    try {
      const data = await getUpcomingVerseOfDay();
      setVerseOfDays(data);
    } catch (error) {
      console.error('Failed to load verse of days:', error);
    } finally {
      setLoadingVerseOfDays(false);
    }
  };

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
        await loadUsers();
        alert(`${pinDialogTargetUser}'s account has been deleted.`);
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user');
      } finally {
        setLoading(false);
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
      await createVerseOfDay(verseOfDayReference, user.username);
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

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const data = await getAllReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoadingCategories(false);
    }
  };

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

  const formatDate = (dateString: string) => {
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
            
            {loadingUsers ? (
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

                  {users.filter(u => u.isAdmin === true).map((userItem, index) => (
                    <DataTable.Row key={index}>
                      <DataTable.Cell style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{userItem.username}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 150 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{userItem.firstName} {userItem.lastName}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 200 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{userItem.email}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 100 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setPinDialogAction('removeAdmin');
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
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>
            )}
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
                          {!userItem.isAdmin && (
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
                  <DataTable.Title style={{ minWidth: 180 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Reference</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 100 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Status</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Created</Text></DataTable.Title>
                  <DataTable.Title style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>Action</Text></DataTable.Title>
                </DataTable.Header>

                {verseOfDays.map((vod) => (
                  <DataTable.Row key={vod.id}>
                    <DataTable.Cell style={{ minWidth: 180 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{vod.readableReference}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ minWidth: 100 }}>
                      <Text style={{ 
                        color: vod.isSent ? theme.colors.onSurfaceVariant : theme.colors.primary,
                        fontFamily: 'Inter',
                        fontWeight: '600'
                      }}>
                        {vod.isSent ? 'Sent' : 'Pending'}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell style={{ minWidth: 140 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{formatDate(vod.createdDate)}</Text></DataTable.Cell>
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
                    <DataTable.Row key={c.category_Id}>
                      <DataTable.Cell style={{ minWidth: 80 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{c.category_Id}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 220 }}><Text style={{ color: theme.colors.onBackground, fontFamily: 'Inter' }}>{c.name}</Text></DataTable.Cell>
                      <DataTable.Cell style={{ minWidth: 120 }}>
                        <TouchableOpacity
                          onPress={() => handleDeleteCategory(c.category_Id)}
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
