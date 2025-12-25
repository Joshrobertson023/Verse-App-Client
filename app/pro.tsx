import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
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
       
        </ScrollView>
    </>
  );
}

