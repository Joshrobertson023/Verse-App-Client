import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import useStyles from './styles';
import useAppTheme from './theme';

export default function ProScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'lifetime'>('lifetime');

  const features = [
    'Home screen widgets',
    'Unlimited collections and user verses',
    'Streak calendar',
    'Personalize and tune your practice sessions',
  ];

  // Get primary color and create gradient colors based on it
  // Primary color is typically #b93838ff (red/burgundy) for light theme
  // Always use red gradient regardless of theme to maintain brand consistency
  // Create gradient colors - lighter at top, darker at bottom (inverted)
  const gradientColors = [
    '#d04848', // Lighter red at top
    '#b93838', // Primary red in middle
    '#a03030', // Darker red at bottom
  ];

  const handleSubscribe = () => {
    // TODO: Integrate payment system here
    const price = selectedPlan === 'yearly' ? '$9.99/year' : '$19.99 one-time';
    alert(`Purchase ${selectedPlan === 'yearly' ? 'Yearly Subscription' : 'Lifetime Access'} for ${price}\n\nPayment integration coming soon!`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerTintColor: '#FFFFFF',
          headerBackTitleVisible: false,
        }}
      />
      <LinearGradient
        colors={gradientColors}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: 20, paddingHorizontal: 20 }}>
            {/* Title */}
            <View style={{ marginBottom: 40, marginTop: 10 }}>
              <Text style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#FFFFFF',
                fontFamily: 'Inter',
                textAlign: 'center',
                marginTop: 40
              }}>
                Upgrade to Pro
              </Text>
            </View>

            {/* Pricing Cards - Side by Side */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
              marginBottom: 40,
            }}>
              {/* Yearly Card - Left */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: selectedPlan === 'yearly' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: selectedPlan === 'yearly' ? 2 : 1,
                  borderColor: selectedPlan === 'yearly' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                  minHeight: 200,
                  justifyContent: 'flex-start',
                  position: 'relative',
                }}
                activeOpacity={0.8}
                onPress={() => setSelectedPlan('yearly')}
              >
                {selectedPlan === 'yearly' && (
                  <View style={{ position: 'absolute', top: 16, right: 16 }}>
                    <Ionicons name="checkmark-circle" size={24} color={gradientColors[1]} />
                  </View>
                )}
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: selectedPlan === 'yearly' ? gradientColors[1] : '#FFFFFF',
                  fontFamily: 'Inter',
                  marginBottom: 16,
                  marginTop: selectedPlan === 'yearly' ? 8 : 0,
                }}>
                  Yearly
                </Text>
                <Text style={{
                  fontSize: 40,
                  fontWeight: '700',
                  color: selectedPlan === 'yearly' ? gradientColors[1] : '#FFFFFF',
                  fontFamily: 'Inter',
                  marginBottom: 8,
                }}>
                  $9.99
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: selectedPlan === 'yearly' ? gradientColors[1] : '#FFFFFF',
                  fontFamily: 'Inter',
                  opacity: selectedPlan === 'yearly' ? 0.8 : 0.9,
                }}>
                  Billed Yearly
                </Text>
              </TouchableOpacity>

              {/* Lifetime Card - Right */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: selectedPlan === 'lifetime' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: selectedPlan === 'lifetime' ? 2 : 1,
                  borderColor: selectedPlan === 'lifetime' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                  minHeight: 200,
                  justifyContent: 'flex-start',
                  position: 'relative',
                }}
                activeOpacity={0.8}
                onPress={() => setSelectedPlan('lifetime')}
              >
                {selectedPlan === 'lifetime' && (
                  <View style={{ position: 'absolute', top: 16, right: 16 }}>
                    <Ionicons name="checkmark-circle" size={24} color={gradientColors[1]} />
                  </View>
                )}
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: selectedPlan === 'lifetime' ? gradientColors[1] : '#FFFFFF',
                  fontFamily: 'Inter',
                  marginBottom: 16,
                  marginTop: selectedPlan === 'lifetime' ? 8 : 0,
                }}>
                  Lifetime
                </Text>
                <Text style={{
                  fontSize: 40,
                  fontWeight: '700',
                  color: selectedPlan === 'lifetime' ? gradientColors[1] : '#FFFFFF',
                  fontFamily: 'Inter',
                  marginBottom: 8,
                }}>
                  $19.99
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: selectedPlan === 'lifetime' ? gradientColors[1] : '#FFFFFF',
                  fontFamily: 'Inter',
                  opacity: selectedPlan === 'lifetime' ? 0.8 : 0.9,
                }}>
                  One-time
                </Text>
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
                    color="#FFFFFF" 
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{
                    fontSize: 16,
                    color: '#FFFFFF',
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
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 32,
                alignItems: 'center',
                marginBottom: 32,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                width: '100%',
              }}
              activeOpacity={0.8}
              onPress={handleSubscribe}
            >
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#FFFFFF',
                fontFamily: 'Inter',
              }}>
                Subscribe
              </Text>
            </TouchableOpacity>

            {/* Additional Info */}
            <Text style={{
              fontSize: 12,
              color: '#FFFFFF',
              fontFamily: 'Inter',
              lineHeight: 18,
              textAlign: 'center',
              opacity: 0.8,
            }}>
              All Pro features unlock immediately upon purchase. Subscriptions auto-renew unless cancelled. Lifetime access is tied to your account.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </>
  );
}

