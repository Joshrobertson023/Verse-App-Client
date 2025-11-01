import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import useStyles from './styles';
import useAppTheme from './theme';

export const options = { headerShown: true };

export default function ActivityTrackingScreen() {
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
            Activity Tracking & Sharing
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
            We track certain activity to notify your friends of your activity on the platform and to support creators. You can control notifications you send to your friends in Settings.
          </Text>

          <Text style={{ ...styles.tinyText, marginBottom: 8, lineHeight: 22, fontWeight: '600' }}>
            Activity that may send notifications to your friends:
          </Text>
          <Text style={{ ...styles.tinyText, marginBottom: 6, lineHeight: 22, marginLeft: 8 }}>
            • You memorize a verse
          </Text>
          <Text style={{ ...styles.tinyText, marginBottom: 12, lineHeight: 22, marginLeft: 8 }}>
            • You publish a collection
          </Text>

          <Text style={{ ...styles.tinyText, marginBottom: 8, lineHeight: 22, fontWeight: '600' }}>
            What we share with users of a published collection:
          </Text>
          <Text style={{ ...styles.tinyText, marginBottom: 12, lineHeight: 22 }}>
            • When you save a published collection, the author is notified that "a user" saved their collection and your username is not shared.
          </Text>

          <Text style={{ ...styles.tinyText, marginBottom: 8, lineHeight: 22, fontWeight: '600' }}>
            What is not shared:
          </Text>
          <Text style={{ ...styles.tinyText, marginBottom: 6, lineHeight: 22 }}>
            • Your private collections and drafts
          </Text>
          <Text style={{ ...styles.tinyText, marginBottom: 6, lineHeight: 22 }}>
            • Your email address and account credentials
          </Text>

          <Text style={{ ...styles.tinyText, marginTop: 8, lineHeight: 22 }}>
            If you have questions about activity tracking or sharing, please contact us via email at therealjoshrobertson@gmail.com.
          </Text>
        </View>
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}


