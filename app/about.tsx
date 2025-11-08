import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import useStyles from './styles';
import useAppTheme from './theme';

export default function AboutScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();

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
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.colors.surface2,
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

            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.colors.surface2,
            }}>
              <Text style={{
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                lineHeight: 22,
              }}>
                Have feedback or ideas? Let us know by sharing your thoughts inside the app via the report feature, or reach out to our team at support@versememorization.app.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
