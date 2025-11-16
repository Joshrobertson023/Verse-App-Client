import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import useStyles from './styles';
import useAppTheme from './theme';
import { TextInput } from 'react-native-paper';
import { useAppStore } from './store';
import { suggestVerseOfDay } from './db';

export default function AboutScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionReference, setSuggestionReference] = useState('');
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'About',
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ padding: 20 }}>
          <View style={{
            marginBottom: 20,
          }}>
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: theme.colors.onBackground,
              fontFamily: 'Inter',
              marginBottom: 12,
            }}>
              VerseMemorization
            </Text>
            <Text style={{
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter',
              lineHeight: 22,
            }}>
              VerseMemorization helps you meditate on Scripture daily, track your progress, and stay connected with friends pursuing the same goal. Dive into curated collections, practice intelligently with spaced repetition, and celebrate every verse you hide in your heart.
            </Text>
            <View style={{ height: 16 }} />
            <Text style={{
              fontSize: 12,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter',
            }}>
              Version 1.0.0
            </Text>
          </View>
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 12,
              fontFamily: 'Inter',
            }}>
              Get Involved
            </Text>

              <Text style={{
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                lineHeight: 22,
              }}>
                Have feedback or ideas? Let us know by sharing your thoughts inside the app via the report feature, or reach out to our team at support@versememorization.app.
              </Text>

              <View style={{ height: 12 }} />

              <AboutLink
                label="Suggest Verse of Day"
                onPress={() => setShowSuggestion(true)}
                icon="bulb-outline"
              />
            </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 12,
              fontFamily: 'Inter',
            }}>
              Learn More
            </Text>

            <AboutLink
              label="Privacy Policy"
              onPress={() => router.push('/privacy')}
              icon="lock-closed-outline"
            />
            <AboutLink
              label="Terms of Service"
              onPress={() => router.push('/terms')}
              icon="document-text-outline"
            />
            <AboutLink
              label="Activity Tracking & Sharing"
              onPress={() => router.push('/activity')}
              icon="people-outline"
            />
          </View>
          </View>
      </ScrollView>

      {/* Suggest Verse of Day Modal */}
      <Modal
        visible={showSuggestion}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSuggestionReference('');
          setShowSuggestion(false);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 400,
              borderWidth: 1,
              borderColor: theme.colors.surface2,
            }}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 12,
              fontFamily: 'Inter'
            }}>
              Suggest Verse of Day
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant, marginBottom: 12, fontFamily: 'Inter' }}>
              Enter a verse reference (e.g., "John 3:16" or "Psalm 23:1-6")
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Verse reference"
              value={suggestionReference}
              onChangeText={setSuggestionReference}
              style={{ backgroundColor: theme.colors.background }}
              outlineStyle={{ borderColor: theme.colors.outline }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setSuggestionReference('');
                  setShowSuggestion(false);
                }}
                activeOpacity={0.1}
              >
                <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Inter', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!suggestionReference.trim()) return;
                  try {
                    setSubmittingSuggestion(true);
                    await suggestVerseOfDay(user.username, suggestionReference.trim());
                    setSuggestionReference('');
                    setShowSuggestion(false);
                  } finally {
                    setSubmittingSuggestion(false);
                  }
                }}
                disabled={submittingSuggestion || !suggestionReference.trim()}
                style={{ opacity: submittingSuggestion || !suggestionReference.trim() ? 0.6 : 1 }}
                activeOpacity={0.1}
              >
                {submittingSuggestion ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text style={{ color: theme.colors.primary, fontFamily: 'Inter', fontWeight: '600' }}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

interface AboutLinkProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function AboutLink({ label, onPress, icon }: AboutLinkProps) {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: theme.colors.surface2,
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
        <Text style={{
          fontSize: 15,
          color: theme.colors.onBackground,
          fontFamily: 'Inter',
        }}>
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}
