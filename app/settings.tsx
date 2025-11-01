import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserCollections, updateSubscribedVerseOfDay, updatePushNotifications, updateActivityNotifications, deleteUser, submitBugReport } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

const RECENT_SEARCHES_KEY = '@verseApp:recentSearches';

export default function SettingsScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const [subscribedVerseOfDay, setSubscribedVerseOfDay] = useState(user.subscribedVerseOfDay ?? true);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(user.pushNotificationsEnabled ?? true);
  const [activityNotificationsEnabled, setActivityNotificationsEnabled] = useState(user.activityNotificationsEnabled ?? true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugReportText, setBugReportText] = useState('');
  const [submittingBugReport, setSubmittingBugReport] = useState(false);
  const [showBugReportSuccess, setShowBugReportSuccess] = useState(false);

  const handleToggleVerseOfDay = async (value: boolean) => {
    setSubscribedVerseOfDay(value);
    try {
      await updateSubscribedVerseOfDay(user.username, value);
      setUser({
        ...user,
        subscribedVerseOfDay: value
      });
    } catch (error) {
      console.error('Failed to update subscription:', error);
      alert('Failed to update subscription');
    }
  };

  const handleTogglePushNotifications = async (value: boolean) => {
    setPushNotificationsEnabled(value);
    try {
      await updatePushNotifications(user.username, value);
      setUser({
        ...user,
        pushNotificationsEnabled: value
      });
    } catch (error) {
      console.error('Failed to update push notifications:', error);
      alert('Failed to update push notifications');
    }
  };

  const handleToggleActivityNotifications = async (value: boolean) => {
    setActivityNotificationsEnabled(value);
    try {
      await updateActivityNotifications(user.username, value);
      setUser({
        ...user,
        activityNotificationsEnabled: value
      });
    } catch (error) {
      console.error('Failed to update activity notifications:', error);
      alert('Failed to update activity notifications');
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    try {
      await deleteUser(user.username);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setUser({
        ...user,
        username: '',
        authToken: ''
      });
      router.replace('../../auth/createName');
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    }
  };

  const handleSubmitBugReport = async () => {
    if (!bugReportText.trim()) {
      alert('Please describe the bug or issue');
      return;
    }

    setSubmittingBugReport(true);
    try {
      await submitBugReport(user.username, bugReportText);
      setBugReportText('');
      setShowBugReport(false);
      setShowBugReportSuccess(true);
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      alert('Failed to submit bug report. Please try again.');
    } finally {
      setSubmittingBugReport(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>

          {/* Notifications Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Notifications
            </Text>

            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              padding: 15,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: theme.colors.onBackground,
                  marginBottom: 4,
                  fontFamily: 'Inter'
                }}>
                  Verse of the Day
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  Receive daily verse notifications
                </Text>
              </View>
              <Switch
                value={subscribedVerseOfDay}
                onValueChange={handleToggleVerseOfDay}
                trackColor={{ false: theme.colors.onSurfaceVariant, true: theme.colors.primary }}
                thumbColor={subscribedVerseOfDay ? theme.colors.surface : theme.colors.onSurfaceVariant}
              />
            </View>

            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              padding: 15,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: theme.colors.onBackground,
                  marginBottom: 4,
                  fontFamily: 'Inter'
                }}>
                  Push Notifications
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  Receive push notifications on device
                </Text>
              </View>
              <Switch
                value={pushNotificationsEnabled}
                onValueChange={handleTogglePushNotifications}
                trackColor={{ false: theme.colors.onSurfaceVariant, true: theme.colors.primary }}
                thumbColor={pushNotificationsEnabled ? theme.colors.surface : theme.colors.onSurfaceVariant}
              />
            </View>

            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              padding: 15,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: theme.colors.onBackground,
                  marginBottom: 4,
                  fontFamily: 'Inter'
                }}>
                  Send Activity Notifications
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  Notify your friends about your activity (e.g. you memorized a verse)
                </Text>
              </View>
              <Switch
                value={activityNotificationsEnabled}
                onValueChange={handleToggleActivityNotifications}
                trackColor={{ false: theme.colors.onSurfaceVariant, true: theme.colors.primary }}
                thumbColor={activityNotificationsEnabled ? theme.colors.surface : theme.colors.onSurfaceVariant}
              />
            </View>
          </View>

          {/* About Section */}
          <View>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              About
            </Text>

            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              padding: 15,
              marginBottom: 10
            }}>
              <Text style={{
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                lineHeight: 20
              }}>
                Verse Memorization App
              </Text>
              <Text style={{
                fontSize: 12,
                color: theme.colors.onSurfaceVariant,
                marginTop: 8,
                fontFamily: 'Inter'
              }}>
                Version 1.0.0
              </Text>
              <View style={{ height: 12 }} />
              <TouchableOpacity
                onPress={() => router.push('/privacy')}
                style={{
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.primary,
                  fontFamily: 'Inter',
                  textDecorationLine: 'underline'
                }}>
                  Privacy Policy
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/terms')}
                style={{
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.primary,
                  fontFamily: 'Inter',
                  textDecorationLine: 'underline'
                }}>
                  Terms of Service
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/activity')}
                style={{
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.primary,
                  fontFamily: 'Inter',
                  textDecorationLine: 'underline'
                }}>
                  Activity Tracking & Sharing
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>


          {/* Report Bug/Issue Section */}
          <View style={{ marginTop: 30, marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Help
            </Text>

            <TouchableOpacity
              style={styles.button_outlined}
              onPress={() => setShowBugReport(true)}
            >
              <Text style={styles.buttonText_outlined}>
                Report Bug/Issue
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View style={{ marginTop: 30, marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.error,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Danger Zone
            </Text>

            <TouchableOpacity
              style={{
                ...styles.button_outlined,
                borderColor: theme.colors.error,
                borderWidth: 1
              }}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text style={{
                ...styles.buttonText_outlined,
                color: theme.colors.error
              }}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Confirmation Dialog */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
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
              color: theme.colors.error,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Delete Account
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 20,
              fontFamily: 'Inter',
              lineHeight: 22
            }}>
              Are you sure you want to delete your account? This action cannot be undone. All your data, collections, and progress will be permanently deleted.
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
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
                onPress={handleDeleteAccount}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.error
                }}
              >
                <Text style={{
                  color: theme.colors.onError,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bug Report Dialog */}
      <Modal
        visible={showBugReport}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBugReport(false)}
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
              Please describe the bug or issue you encountered:
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
                height: 150,
                textAlignVertical: 'top'
              }}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={bugReportText}
              onChangeText={setBugReportText}
              multiline
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowBugReport(false);
                  setBugReportText('');
                }}
                disabled={submittingBugReport}
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
                onPress={handleSubmitBugReport}
                disabled={submittingBugReport}
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
                  {submittingBugReport ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bug Report Success Dialog */}
      <Modal
        visible={showBugReportSuccess}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBugReportSuccess(false)}
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
              Thank You!
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 20,
              fontFamily: 'Inter',
              lineHeight: 22
            }}>
              Thank you for reporting the issue you encountered. We will look into this and get back to you via email if needed.
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowBugReportSuccess(false)}
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
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
