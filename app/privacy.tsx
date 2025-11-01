import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStyles from './styles';
import useAppTheme from './theme';

export const options = { headerShown: true };

export default function PrivacyPolicyScreen() {
  const styles = useStyles();
  const theme = useAppTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ backgroundColor: theme.colors.background }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <Text style={{
            fontSize: 28,
            fontWeight: '800',
            color: theme.colors.onBackground,
            fontFamily: 'Inter'
          }}>
            Privacy Policy
          </Text>
          <Text style={{
            fontSize: 12,
            color: theme.colors.onBackground,
            opacity: 0.8,
            marginTop: 6,
            fontFamily: 'Inter'
          }}>
            Last updated: October 30, 2025
          </Text>
        </View>
      </View>

      <View style={{ padding: 20 }}>
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 }
        }}>
          <Text style={{ ...styles.tinyText, marginBottom: 12, lineHeight: 22 }}>
            We respect your privacy as the user and will not sell or share your personal data with any third parties. Your information and content are solely used to provide features and to improve the app.
          </Text>
          <Text style={{ ...styles.tinyText, marginBottom: 12, lineHeight: 22 }}>
            We will not use your email to send spam notifications. We only keep your email to secure your account and to follow up on a user report or bug report you submitted. We may contact you regarding suspected violations of our Terms of Service or in the rare case to notify you of important information about your account.
          </Text>

          <Text style={{ ...styles.tinyText, marginBottom: 12, lineHeight: 22 }}>
            Information we store about you may include your name, username, email, saved verses and verse collections, activity on the platform, and app preferences. You may request to be completely forgotten at any time by choosing the account deletion option on the Settings page.
          </Text>

          <Text style={{ ...styles.tinyText, marginBottom: 12, lineHeight: 22 }}>
            As we value your security and privacy, we use security measures to protect your information while in transit and in storage.
          </Text>

          <Text style={{ ...styles.tinyText, marginBottom: 4, lineHeight: 22 }}>
            For questions about this policy, please contact us via email at: therealjoshrobertson@gmail.com.
          </Text>
        </View>
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}


