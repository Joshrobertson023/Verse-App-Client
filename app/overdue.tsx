import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import PracticeModeModal from './components/practiceModeModal';
import { getOverdueVerses, getVerseSearchResult } from './db';
import { useAppStore, UserVerse } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

export default function OverdueScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const [overdueVerses, setOverdueVerses] = useState<UserVerse[]>([]);
  const [overdueVersesLoaded, setOverdueVersesLoaded] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [practiceModeModalVisible, setPracticeModeModalVisible] = useState(false);
  const [selectedUserVerse, setSelectedUserVerse] = useState<UserVerse | null>(null);

  // Load overdue verses when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user.username === 'Default User') return;
      
      (async () => {
        try {
          const overdue = await getOverdueVerses(user.username);
          // Sort by most overdue (oldest lastPracticed first)
          const sortedOverdue = [...overdue].sort((a, b) => {
            const aDate = a.lastPracticed ? new Date(a.lastPracticed).getTime() : 0;
            const bDate = b.lastPracticed ? new Date(b.lastPracticed).getTime() : 0;
            return aDate - bDate; // Oldest first
          });
          setOverdueVerses(sortedOverdue);
          setOverdueVersesLoaded(true);
        } catch (e) {
          console.error('Failed to load overdue verses', e);
          setOverdueVersesLoaded(false);
        }
      })();
    }, [user.username])
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 20,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outline,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontFamily: 'Inter bold',
            color: theme.colors.onBackground,
            flex: 1,
          }}
        >
          All Overdue
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingTop: 20,
        }}
      >
        {overdueVersesLoaded && (
          <View style={{ width: '100%' }}>
            {overdueVerses.length > 0 ? (
              <View style={{ flexDirection: 'row', position: 'relative' }}>
                <View style={{ flex: 1, marginLeft: 30 }}>
                  {overdueVerses.map((uv, index) => {
                    const lastPracticed = uv.lastPracticed ? new Date(uv.lastPracticed) : null;
                    const now = new Date();
                    const diffMs = lastPracticed ? now.getTime() - lastPracticed.getTime() : 0;
                    const diffHours = diffMs ? Math.floor(diffMs / (1000 * 60 * 60)) : 0;
                    const diffDays = diffMs ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
                    const diffWeeks = diffMs ? Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)) : 0;
                    const diffMonths = diffMs ? Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)) : 0;
                    let timeAgo = '';
                    if (diffMonths > 0) {
                      timeAgo = `${diffMonths}mo ago`;
                    } else if (diffWeeks > 0) {
                      timeAgo = `${diffWeeks}w ago`;
                    } else if (diffDays > 0) {
                      timeAgo = `${diffDays}d ago`;
                    } else {
                      timeAgo = `${diffHours}hr ago`;
                    }
                    
                    return (
                      <View key={uv.id || index} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        position: 'relative',
                        marginBottom: 16
                      }}>
                        <View style={{
                          position: 'absolute',
                          left: -10,
                          top: 0,
                          width: 4,
                          height: 30,
                          borderRadius: 9999,
                          backgroundColor: theme.colors.onBackground
                        }}/>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, height: 30 }}>
                          <Text style={{ color: '#ff4444', fontSize: 16, marginRight: 8 }}>!</Text>
                          <Text style={{ fontFamily: 'Inter', fontSize: 16, color: theme.colors.onBackground, marginRight: 12 }}>
                            {uv.readableReference}
                          </Text>
                          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                            {timeAgo}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          activeOpacity={0.1}
                          onPress={async () => {
                            try {
                              // Populate verses if not already populated
                              let verseToPractice = uv;
                              if (!verseToPractice.verses || verseToPractice.verses.length === 0) {
                                const searchData = await getVerseSearchResult(uv.readableReference);
                                verseToPractice = { ...uv, verses: searchData.verses || [] };
                              }
                              setSelectedUserVerse(verseToPractice);
                              setPracticeModeModalVisible(true);
                            } catch (e) {
                              console.error('Failed to load verse for practice', e);
                              setSnackbarMessage('Failed to load verse');
                              setSnackbarVisible(true);
                            }
                          }}
                        >
                          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: theme.colors.primary, textDecorationLine: 'underline' }}>
                            Practice &gt;
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', position: 'relative', marginTop: 20 }}>
                {/* L shape for empty state */}
                <View style={{ marginLeft: 20, alignItems: 'flex-start' }}>
                  <View style={{
                    position: 'absolute',
                    left: -10,
                    top: 0,
                    width: 4,
                    height: 30,
                    borderRadius: 9999,
                    backgroundColor: theme.colors.onBackground
                  }}/>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-start', marginLeft: 10, marginTop: 5 }}>
                  <Text style={{ 
                    fontFamily: 'Inter', 
                    fontSize: 14, 
                    color: theme.colors.onBackground,
                  }}>
                    No passages overdue
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Text style={{ color: theme.colors.onSurface, fontFamily: 'Inter' }}>
          {snackbarMessage}
        </Text>
      </Snackbar>

      <PracticeModeModal
        visible={practiceModeModalVisible}
        onClose={() => {
          setPracticeModeModalVisible(false);
          setSelectedUserVerse(null);
        }}
        onSelectLearn={() => {
          if (!selectedUserVerse) return;
          const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
          setEditingUserVerse(selectedUserVerse);
          router.push('/practiceSession');
        }}
      />
    </View>
  );
}

