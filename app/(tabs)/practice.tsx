import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Surface } from 'react-native-paper';
import { UserVerse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { getAllUserVerses } from '../db';

const baseUrl = 'http://10.169.51.121:5160';

export default function PracticeScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const [versesInProgress, setVersesInProgress] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserVerses = async () => {
      try {
        setLoading(true);
        if (!user.username) {
          setVersesInProgress([]);
          setLoading(false);
          return;
        }
        
        // Fetch all user verses from the database, sorted by percentMemorized (DESC)
        const allPassages = await getAllUserVerses(user.username);
        
        console.log('Fetched passages:', allPassages.length);
        console.log('Sample passage:', JSON.stringify(allPassages[0], null, 2));
        console.log('Sample readableReference:', allPassages[0]?.readableReference);
        
        // Sort by progress percent (lowest first) for display
        const sorted = allPassages.sort((a, b) => (a.progressPercent || 0) - (b.progressPercent || 0));
        
        setVersesInProgress(sorted);
      } catch (error) {
        console.error('Failed to fetch user verses:', error);
        setVersesInProgress([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserVerses();
  }, [user.username]);

  const handlePractice = async (userVerse: UserVerse) => {
    try {
      // If verses are not populated, fetch them first
      if (!userVerse.verses || userVerse.verses.length === 0) {
        console.log('Fetching verse details for:', userVerse.readableReference);
        
        if (!userVerse.id) {
          console.error('UserVerse ID is missing:', userVerse);
          alert('Error: Missing passage ID');
          return;
        }
        
        const response = await fetch(`${baseUrl}/userverses/${userVerse.id}`);
        if (response.ok) {
          const populatedUserVerse = await response.json();
          
          // Check if we got verses back
          if (!populatedUserVerse.verses || populatedUserVerse.verses.length === 0) {
            console.error('No verses found for:', userVerse.readableReference);
            alert('Error: Could not load verse text for ' + userVerse.readableReference);
            return;
          }
          
          const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
          setEditingUserVerse(populatedUserVerse);
          router.push('/practiceSession');
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch verse details:', response.status, errorText);
          alert('Error: Failed to load verse details');
        }
      } else {
        const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
        setEditingUserVerse(userVerse);
        router.push('/practiceSession');
      }
    } catch (error) {
      console.error('Error fetching verse details:', error);
      alert('Error: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ ...styles.text, marginTop: 20 }}>Loading passages...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 100,
          paddingHorizontal: 20,
          paddingTop: 20,
          width: '100%'
        }}
      >
        {versesInProgress.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }}>
            <Ionicons name="book-outline" size={80} color={theme.colors.onSurface} />
            <Text style={{ ...styles.text, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
              No Passages Yet
            </Text>
            <Text style={{ ...styles.tinyText, marginTop: 10, textAlign: 'center', color: theme.colors.onSurface }}>
              Add passages to your collections to start practicing
            </Text>
          </View>
        ) : versesInProgress.every((uv) => (uv.progressPercent || 0) === 0) ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }}>
            <Ionicons name="arrow-up-circle-outline" size={80} color={theme.colors.onSurface} />
            <Text style={{ ...styles.text, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
              Ready to Practice!
            </Text>
            <Text style={{ ...styles.tinyText, marginTop: 10, textAlign: 'center', color: theme.colors.onSurface }}>
              Tap any passage below to start practicing a new one
            </Text>
            <View style={{ marginTop: 30, width: '100%' }}>
              {versesInProgress.map((userVerse, index) => (
                <TouchableOpacity
                  key={userVerse.id || `practice-${index}`}
                  onPress={() => handlePractice(userVerse)}
                  style={{ width: '100%', marginBottom: 15 }}
                >
                  <Surface style={{ width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }} elevation={4}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600, fontSize: 18 }}>
                          {userVerse.readableReference || 'Unknown Reference'}
                        </Text>
                        <Text style={{ ...styles.tinyText, marginTop: 5, color: theme.colors.primary }}>
                          {userVerse.progressPercent || 0}% memorized
                        </Text>
                        {userVerse.verses && userVerse.verses.length > 0 && (
                          <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 16, marginTop: 5, opacity: 0.7 }}>
                            {userVerse.verses[0].text.substring(0, 50)}{userVerse.verses[0].text.length > 50 ? '...' : ''}
                          </Text>
                        )}
                        {(!userVerse.verses || userVerse.verses.length === 0) && (
                          <Text style={{ ...styles.tinyText, marginTop: 5, opacity: 0.5 }}>
                            Tap to load verse details
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 15 }}>
                        <Ionicons name="play-circle-outline" size={40} color={theme.colors.primary} />
                      </View>
                    </View>
                  </Surface>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View>
            <Text style={{ ...styles.subheading, marginTop: 20, marginBottom: 10 }}>
              In Progress ({versesInProgress.length})
            </Text>
            {versesInProgress.map((userVerse, index) => (
              <TouchableOpacity
                key={userVerse.id || `progress-${index}`}
                onPress={() => handlePractice(userVerse)}
                style={{ width: '100%', marginBottom: 15 }}
              >
                <Surface style={{ width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }} elevation={4}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600, fontSize: 18 }}>
                        {userVerse.readableReference || 'Unknown Reference'}
                      </Text>
                      <Text style={{ ...styles.tinyText, marginTop: 5, color: theme.colors.primary }}>
                        {userVerse.progressPercent || 0}% memorized
                      </Text>
                      {userVerse.verses && userVerse.verses.length > 0 && (
                        <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 16, marginTop: 5, opacity: 0.7 }}>
                          {userVerse.verses[0].text.substring(0, 50)}{userVerse.verses[0].text.length > 50 ? '...' : ''}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 15 }}>
                      <Ionicons name="chevron-forward" size={24} color={theme.colors.onBackground} />
                    </View>
                  </View>
                </Surface>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
