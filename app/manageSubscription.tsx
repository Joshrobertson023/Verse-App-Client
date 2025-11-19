import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from './store';
import useAppTheme from './theme';

export default function ManageSubscriptionScreen() {
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              // TODO: Integrate with payment system to cancel subscription
              // For now, this is a placeholder
              await new Promise(resolve => setTimeout(resolve, 1000));
              Alert.alert(
                'Subscription Cancelled',
                'Your subscription will remain active until the end of your current billing period. You will lose access to Pro features after that.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Failed to cancel subscription:', error);
              Alert.alert('Error', 'Failed to cancel subscription. Please try again or contact support.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const proFeatures = [
    'Unlimited collections (up to 40)',
    'Unlimited verses per collection',
    'All free features included',
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manage Subscription',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.onBackground,
          headerTitleStyle: {
            fontFamily: 'Inter',
            fontSize: 18,
          },
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {/* Status Card */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  marginRight: 12,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.onPrimary,
                    fontSize: 12,
                    fontWeight: '700',
                    fontFamily: 'Inter',
                  }}
                >
                  PRO
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter',
                }}
              >
                Active Subscription
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                lineHeight: 20,
              }}
            >
              You currently have access to all Pro features. Your subscription is active.
            </Text>
          </View>

          {/* Features List */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.colors.onBackground,
                fontFamily: 'Inter',
                marginBottom: 16,
              }}
            >
              Your Pro Benefits
            </Text>
            {proFeatures.map((feature, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.primary}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontSize: 15,
                    color: theme.colors.onBackground,
                    fontFamily: 'Inter',
                    flex: 1,
                  }}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Subscription Details */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.colors.onBackground,
                fontFamily: 'Inter',
                marginBottom: 16,
              }}
            >
              Subscription Details
            </Text>
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  marginBottom: 4,
                }}
              >
                Status
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                }}
              >
                Active
              </Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  marginBottom: 4,
                }}
              >
                Account
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                }}
              >
                @{user.username}
              </Text>
            </View>
            <View>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  marginBottom: 4,
                }}
              >
                Subscription Type
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                }}
              >
                Pro (Lifetime)
              </Text>
            </View>
          </View>

          {/* Cancel Subscription Button */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.error,
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 24,
              alignItems: 'center',
              marginTop: 8,
              opacity: isCancelling ? 0.6 : 1,
            }}
            activeOpacity={0.8}
            onPress={handleCancelSubscription}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={theme.colors.onError} />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.colors.onError,
                  fontFamily: 'Inter',
                }}
              >
                Cancel Subscription
              </Text>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter',
              textAlign: 'center',
              marginTop: 24,
              lineHeight: 18,
            }}
          >
            Need help? Contact support for assistance with your subscription.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}








