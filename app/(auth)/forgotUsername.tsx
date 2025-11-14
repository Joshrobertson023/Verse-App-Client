import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestUsernameReminder } from '../db';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function ForgotUsernameScreen() {
  const styles = useStyles();
  const theme = useAppTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      Keyboard.dismiss();
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setErrorMessage('Please complete all fields.');
        setLoading(false);
        return;
      }

      await requestUsernameReminder(firstName.trim(), lastName.trim(), email.trim());

      setSuccessMessage('An email with your username(s) has been sent.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reminder.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ ...styles.centered, marginBottom: 150 }}>
        <Text style={{ ...styles.text, marginBottom: 20 }}>Forgot Username</Text>
        <TextInput
          label="First Name"
          mode="outlined"
          style={styles.input}
          value={firstName}
          onChangeText={(text) => setFirstName(text)}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextInput
          label="Last Name"
          mode="outlined"
          style={styles.input}
          value={lastName}
          onChangeText={(text) => setLastName(text)}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextInput
          label="Email"
          mode="outlined"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={(text) => setEmail(text)}
          autoCapitalize="none"
        />

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {successMessage ? (
          <Text
            style={{
              ...styles.tinyText,
              color: theme.colors.primary,
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            {successMessage}
          </Text>
        ) : null}

        <TouchableOpacity style={{ ...styles.button_filled, marginTop: 12 }} onPress={handleSubmit}>
          {loading ? (
            <Text style={styles.buttonText_filled}>
              <ActivityIndicator animating={true} color={theme.colors.background} />
            </Text>
          ) : (
            <Text style={styles.buttonText_filled}>Send Username</Text>
          )}
        </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

