import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAllUserVerses, updateUserProfile } from '../db';
import { loggedOutUser, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const RECENT_SEARCHES_KEY = '@verseApp:recentSearches';

export { router };


export default function ProfileScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const setCollections = useAppStore((state) => state.setCollections);
  const [showDescriptionEdit, setShowDescriptionEdit] = useState(false);
  const [tempDescription, setTempDescription] = useState(user.description || '');
  const [memorizedCount, setMemorizedCount] = useState<number>(0);
  
  // Use isAdmin from user state
  const isAdmin = user.isAdmin === true;

  useEffect(() => {
    const loadMemorizedCount = async () => {
      try {
        const verses = await getAllUserVerses(user.username);
        const count = verses.filter(v => (v as any).progressPercent === 100).length;
        setMemorizedCount(count);
      } catch (error) {
        console.error('Failed to load memorized count:', error);
        setMemorizedCount(0);
      }
    };
    loadMemorizedCount();
  }, [user.username]);

  const logoutClick = async () => {
    setUser(loggedOutUser);
    await SecureStore.deleteItemAsync('userToken');
    // Clear recent searches from local storage
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    setCollections([]);
    router.replace('/(auth)/createName');
  };

  const getDisplayName = () => {
    return `${user.firstName} ${user.lastName}`;
  };

  const getVersesMemorized = () => {
    return memorizedCount || 0;
  };

  const handleSaveDescription = async () => {
    try {
      await updateUserProfile({ ...user, description: tempDescription });
      setUser({ ...user, description: tempDescription });
      setShowDescriptionEdit(false);
    } catch (error) {
      console.error('Failed to update description:', error);
      alert('Failed to update description');
    }
  };

  const handleCancelDescription = () => {
    setTempDescription(user.description || '');
    setShowDescriptionEdit(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 20, paddingTop: 0 }}>
      {/* Profile Section */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
          <View style={{ position: 'relative' }}>
            {/* Profile Picture Placeholder */}
            <View style={{ 
              width: 70, 
              height: 70, 
              borderRadius: 35, 
              backgroundColor: theme.colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: theme.colors.onBackground
            }}>
              <Ionicons name="person" size={40} color={theme.colors.onBackground} />
            </View>
            {/* Online Status Indicator */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#4CAF50',
              borderWidth: 3,
              borderColor: theme.colors.background
            }} />
          </View>
          
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={{ 
              fontSize: 24, 
              fontWeight: '600', 
              color: theme.colors.onBackground,
              fontFamily: 'Inter'
            }}>
              {getDisplayName()}
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter'
            }}>
              @{user.username}
            </Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={{ marginBottom: 30, marginTop: -20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            {/* <TouchableOpacity activeOpacity={0.1} onPress={() => setShowDescriptionEdit(true)}>
              <Ionicons name="pencil" size={20} color={theme.colors.onBackground} />
            </TouchableOpacity> */}
          </View>
          {user.description && (
            <Text style={{ 
              fontSize: 14, 
              color: theme.colors.onBackground,
              fontFamily: 'Inter',
              lineHeight: 20
            }}>
              {user.description}
            </Text>
          )}
        </View>

        {/* Stats Row */}
        <View style={{ 
          flexDirection: 'row', 
          marginBottom: 10,
          width: '100%',
        }}>
          {/* Day Streak */}
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <View style={{
              justifyContent: 'center',
              marginTop: -10
            }}>
              <Ionicons name="flame" size={52} color={theme.colors.onBackground} />
            </View>
            <View style={{
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <Text style={{
                  ...styles.text, 
                  marginBottom: -7,
                  marginTop: -5,
                  fontSize: 36,
                  fontWeight: 800,
                  color: theme.colors.onBackground,
                }}>
                {user.streakLength || 0}
              </Text>
              <Text style={{
                ...styles.text, 
                margin: 0, 
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
              }}>
                Day Streak
              </Text>
            </View>
          </View>

          {/* Verses in Memory */}
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
          }}>
            <View style={{
              justifyContent: 'center',
              marginTop: -18,
              marginRight: 5
            }}>
              <Ionicons name="checkmark-done" size={58} color={theme.colors.onBackground} />
            </View>
            <View style={{
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <Text style={{
                  ...styles.text, 
                  marginBottom: -7,
                  marginTop: -5,
                  fontSize: 36,
                  fontWeight: 800,
                  color: theme.colors.onBackground,
                }}>
                {getVersesMemorized()}
              </Text>
              <Text style={{
                ...styles.text, 
                margin: 0, 
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
              }}>
                Memorized
              </Text>
            </View>
          </View>
        </View>

        {/* Buttons */}

        
        <TouchableOpacity 
          style={{ 
            ...styles.button_outlined
          }}
          activeOpacity={0.1}
          onPress={() => router.push('/user/friends')}
        >
          <Text style={styles.buttonText_outlined}>Friends</Text>
        </TouchableOpacity>

        <View style={{
          marginTop: 20,
          paddingTop: 20,
        }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
              activeOpacity={0.1}
              onPress={() => router.push('/user/streak')}
            >
              <Ionicons name="calendar" size={24} color={theme.colors.onBackground} />
              <Text style={{ 
                ...styles.tinyText, 
                alignSelf: 'flex-start',
                marginLeft: 15,
                fontSize: 16,
                color: theme.colors.onBackground,
                fontWeight: 400
              }}>Streak Calendar</Text>
            </TouchableOpacity>

          <TouchableOpacity style={{
            flexDirection: 'row', alignItems: 'center', paddingVertical: 12
          }}
          onPress={() => router.push('/user/memorizedVerses')}>
              <Ionicons name="checkmark-done" size={24} color={theme.colors.onBackground} />
            <Text style={{
                ...styles.tinyText, 
                alignSelf: 'flex-start',
                marginLeft: 15,
                fontSize: 16,
                color: theme.colors.onBackground,
                fontWeight: 400
            }}>Memorized Passages</Text>
          </TouchableOpacity>
        </View>
        {/* Footer Navigation */}
        <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.onSurfaceVariant }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
            activeOpacity={0.1}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings" size={24} color={theme.colors.onBackground} />
            <Text style={{ 
                ...styles.tinyText, 
                alignSelf: 'flex-start',
                marginLeft: 15,
                fontSize: 16,
                color: theme.colors.onBackground,
                fontWeight: 400
            }}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
            activeOpacity={0.1}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="information" size={24} color={theme.colors.onBackground} />
            <Text style={{ 
                ...styles.tinyText, 
                alignSelf: 'flex-start',
                marginLeft: 15,
                fontSize: 16,
                color: theme.colors.onBackground,
                fontWeight: 400
            }}>About</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
              activeOpacity={0.1}
              onPress={() => router.push('/admin')}
            >
              <Ionicons name="shield" size={24} color={theme.colors.primary} />
              <Text style={{ 
                ...styles.tinyText, 
                alignSelf: 'flex-start',
                marginLeft: 15,
                fontSize: 16,
                color: theme.colors.onBackground,
                fontWeight: 400
              }}>Admin Panel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={{ 
            ...styles.button_outlined, 
            marginTop: 30,
            borderColor: theme.colors.error,
            borderWidth: 1 
          }}
          activeOpacity={0.1}
          onPress={logoutClick}
        >
          <Text style={[styles.buttonText_outlined, { color: theme.colors.error }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Description Modal */}
      <Modal
        visible={showDescriptionEdit}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDescription}
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
              Edit Description
            </Text>
            
            <TextInput
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 12,
                color: theme.colors.onBackground,
                fontSize: 16,
                fontFamily: 'Inter',
                minHeight: 100,
                maxHeight: 150,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: theme.colors.outline
              }}
              placeholder=""
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={tempDescription}
              onChangeText={(text) => {
                if (text.length <= 100) {
                  setTempDescription(text);
                }
              }}
              multiline
              autoFocus
            />
            
            <Text style={{
              fontSize: 12,
              color: theme.colors.onSurfaceVariant,
              marginTop: 8,
              textAlign: 'right',
              fontFamily: 'Inter'
            }}>
              {tempDescription.length}/100
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
              <TouchableOpacity
                onPress={handleCancelDescription}
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
                onPress={handleSaveDescription}
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
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}