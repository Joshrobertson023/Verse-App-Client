import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import useStyles from './styles';
import useAppTheme from './theme';

export default function ProScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  
  // Pricing
  const monthlyPrice = 2.99;
  const yearlyPrice = 11.99;

  const features = [
    'Unlimited collections and user verses',
    'AI commentary on any passage',
    'Streak calendar with historical practice data',
    'Personalize and tune your practice sessions',
  ];

  const handleSubscribe = () => {
    // TODO: Integrate payment system here
    const price = selectedPlan === 'yearly' ? `$${yearlyPrice.toFixed(2)}/year` : `$${monthlyPrice.toFixed(2)}/month`;
    alert(`Purchase ${selectedPlan === 'yearly' ? 'Yearly Subscription' : 'Monthly Subscription'} for ${price}\n\nPayment integration coming soon!`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.onBackground,
          headerShadowVisible: false,
        }}
      />
      <ScrollView 
        style={{ flex: 1, backgroundColor: theme.colors.background }} 
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 0, paddingHorizontal: 20 }}>
            {/* Title */}
            <View style={{ marginBottom: 40, marginTop: 0 }}>
              <Text style={{
                fontSize: 32,
                fontWeight: '700',
                color: theme.colors.onBackground,
                fontFamily: 'Inter',
                textAlign: 'center',
                marginTop: 0
              }}>
                Unlock Verse Memorization Pro
              </Text>
              <Text style={{...styles.tinyText, textAlign: 'center', width: '90%', marginTop: 10, alignSelf: 'center'}}>
                Unlock your full potential to memorize Scripture and apply it to your life!
              </Text>
            </View>

            {/* Pricing Cards - Side by Side */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
              marginBottom: 40,
            }}>
              {/* Monthly Card - Left */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: selectedPlan === 'monthly' ? theme.colors.primary : theme.colors.surface,
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                  borderColor: selectedPlan === 'monthly' ? theme.colors.primary : theme.colors.outline,
                  minHeight: 200,
                  justifyContent: 'flex-start',
                  position: 'relative',
                }}
                activeOpacity={0.8}
                onPress={() => setSelectedPlan('monthly')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: selectedPlan === 'monthly' ? theme.colors.onPrimary : theme.colors.onBackground,
                    fontFamily: 'Inter',
                  }}>
                    Monthly
                  </Text>
                  {selectedPlan === 'monthly' && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.onPrimary} />
                  )}
                </View>
                <Text style={{
                  fontSize: 40,
                  fontWeight: '700',
                  color: selectedPlan === 'monthly' ? theme.colors.onPrimary : theme.colors.onBackground,
                  fontFamily: 'Inter',
                  marginBottom: 8,
                }}>
                  ${monthlyPrice.toFixed(2)}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: selectedPlan === 'monthly' ? theme.colors.onPrimary : theme.colors.onBackground,
                  fontFamily: 'Inter',
                  opacity: selectedPlan === 'monthly' ? 0.9 : 0.8,
                }}>
                  Billed Monthly
                </Text>
              </TouchableOpacity>

              {/* Yearly Card - Right */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: selectedPlan === 'yearly' ? theme.colors.primary : theme.colors.surface,
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: selectedPlan === 'yearly' ? 2 : 1,
                  borderColor: selectedPlan === 'yearly' ? theme.colors.primary : theme.colors.outline,
                  minHeight: 200,
                  justifyContent: 'flex-start',
                  position: 'relative',
                }}
                activeOpacity={0.8}
                onPress={() => setSelectedPlan('yearly')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: selectedPlan === 'yearly' ? theme.colors.onPrimary : theme.colors.onBackground,
                    fontFamily: 'Inter',
                  }}>
                    Yearly
                  </Text>
                  {selectedPlan === 'yearly' && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.onPrimary} />
                  )}
                </View>
                <Text style={{
                  fontSize: 40,
                  fontWeight: '700',
                  color: selectedPlan === 'yearly' ? theme.colors.onPrimary : theme.colors.onBackground,
                  fontFamily: 'Inter',
                  marginBottom: 8,
                }}>
                  ${yearlyPrice.toFixed(2)}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: selectedPlan === 'yearly' ? theme.colors.onPrimary : theme.colors.onBackground,
                  fontFamily: 'Inter',
                  opacity: selectedPlan === 'yearly' ? 0.9 : 0.8,
                  marginBottom: 8,
                }}>
                  Billed Yearly
                </Text>
                <View style={{
                  backgroundColor: selectedPlan === 'yearly' ? theme.colors.onPrimary : theme.colors.primary,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  alignSelf: 'flex-start',
                }}>
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: selectedPlan === 'yearly' ? theme.colors.primary : theme.colors.onPrimary,
                    fontFamily: 'Inter',
                  }}>
                    SAVE 70%
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Features List */}
            <View style={{ marginBottom: 40 }}>
              {features.map((feature, index) => (
                <View 
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={theme.colors.primary} 
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{
                    fontSize: 16,
                    color: theme.colors.onBackground,
                    fontFamily: 'Inter',
                    flex: 1,
                    lineHeight: 22,
                  }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 32,
                alignItems: 'center',
                marginBottom: 32,
                width: '100%',
              }}
              activeOpacity={0.8}
              onPress={handleSubscribe}
            >
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: theme.colors.onPrimary,
                fontFamily: 'Inter',
              }}>
                Subscribe
              </Text>
            </TouchableOpacity>

            {/* Additional Info */}
            <Text style={{
              fontSize: 12,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter',
              lineHeight: 18,
              textAlign: 'center',
            }}>
              All Pro features unlock immediately upon purchase. Subscriptions auto-renew unless cancelled.
            </Text>
          </View>
        </ScrollView>
    </>
  );
}

