import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStyles from './styles';
import useAppTheme from './theme';

export const options = { headerShown: true };

export default function TermsOfServiceScreen() {
  const styles = useStyles();
  const theme = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ backgroundColor: theme.colors.background }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <Text style={{
            fontSize: 28,
            fontWeight: '800',
            color: theme.colors.onBackground,
            fontFamily: 'Inter'
          }}>
            Terms of Service
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

      <ScrollView contentContainerStyle={{ padding: 20 }}>
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
            By using this app, you agree to reasonable use of the platform and to remain compliant with applicable laws.
          </Text>
          <Text style={{ ...styles.tinyText, marginBottom: 12, lineHeight: 22 }}>
            We uphold the ability to terminate your account at any time without notice if we suspect any violation of these terms or of any activity that negatively impacts our system, brand, or reputation.
          </Text>
          <Text style={{ ...styles.tinyText, marginBottom: 12, lineHeight: 22 }}>
            We may update these terms from time to time. Continued use of the app means you agree to the updated terms.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}