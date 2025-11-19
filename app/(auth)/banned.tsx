import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { formatDate } from '../dateUtils';

export default function BannedScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ reason?: string; banDate?: string; banExpireDate?: string }>();
  
  const reason = params.reason || 'Your account has been banned.';
  const banDate = params.banDate ? new Date(params.banDate) : new Date();
  const banExpireDate = params.banExpireDate ? new Date(params.banExpireDate) : null;

  const handleEmailPress = () => {
    Linking.openURL('mailto:therealjoshrobertson@gmail.com?subject=Ban Appeal');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          justifyContent: 'center', 
          paddingHorizontal: 20,
          paddingVertical: 40
        }}
      >
        <View style={{ alignItems: 'center', width: '100%' }}>
          <Text style={{
            fontSize: 32,
            fontWeight: '700',
            color: theme.colors.error,
            marginBottom: 20,
            fontFamily: 'Inter',
            textAlign: 'center'
          }}>
            Account Banned
          </Text>

          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            marginBottom: 24
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 12,
              fontFamily: 'Inter'
            }}>
              Reason:
            </Text>
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 20,
              fontFamily: 'Inter',
              lineHeight: 24
            }}>
              {reason}
            </Text>

            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 12,
              fontFamily: 'Inter'
            }}>
              Ban Date:
            </Text>
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 20,
              fontFamily: 'Inter'
            }}>
              {formatDate(banDate)}
            </Text>

            {banExpireDate && (
              <>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: theme.colors.onBackground,
                  marginBottom: 12,
                  fontFamily: 'Inter'
                }}>
                  Ban Expires:
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 20,
                  fontFamily: 'Inter'
                }}>
                  {formatDate(banExpireDate)}
                </Text>
              </>
            )}

            {!banExpireDate && (
              <Text style={{
                fontSize: 16,
                color: theme.colors.error,
                fontFamily: 'Inter',
                fontWeight: '600',
                marginTop: 8
              }}>
                This ban is permanent.
              </Text>
            )}
          </View>

          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            marginBottom: 24
          }}>
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter',
              lineHeight: 24,
              textAlign: 'center',
              marginBottom: 16
            }}>
              If you have questions or concerns about this ban, please contact us:
            </Text>
            <TouchableOpacity
              onPress={handleEmailPress}
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center'
              }}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.colors.onPrimary,
                fontFamily: 'Inter'
              }}>
                Contact: therealjoshrobertson@gmail.com
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={{
              padding: 12,
              marginTop: 8
            }}
          >
            <Text style={{
              fontSize: 14,
              color: theme.colors.primary,
              fontFamily: 'Inter'
            }}>
              Return to Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}










