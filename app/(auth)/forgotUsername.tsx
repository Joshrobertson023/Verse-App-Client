import React, { useState } from 'react';
import { Alert, Keyboard, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { ActivityIndicator, HelperText, TextInput } from 'react-native-paper';
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
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [firstNameEmpty, setFirstNameEmpty] = useState(false);
  const [lastNameEmpty, setLastNameEmpty] = useState(false);
  const [emailEmpty, setEmailEmpty] = useState(false);

  const handleSubmit = async () => {
    try {
      Keyboard.dismiss();
      setLoading(true);
      setSuccessMessage('');

      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setFirstNameEmpty(!firstName.trim());
        setLastNameEmpty(!lastName.trim());
        setEmailEmpty(!email.trim());
        Alert.alert('Missing information', 'Please complete all fields.', [{ text: 'OK' }]);
        setLoading(false);
        return;
      }

      await requestUsernameReminder(firstName.trim(), lastName.trim(), email.trim());

      setSuccessMessage('An email with your username(s) has been sent.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reminder.';
      Alert.alert('Unable to send reminder', message, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ ...styles.centered, marginBottom: 150, paddingHorizontal: 20 }}>
        <Text style={{ ...styles.text, marginBottom: 20 }}>Forgot Username</Text>
        <TextInput
          label="First Name"
          mode="outlined"
          style={styles.input}
          error={firstNameEmpty}
          value={firstName}
          onChangeText={(text) => setFirstName(text)}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <HelperText style={{ textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25 }} type="error" visible={firstNameEmpty}>
          Enter your first name
        </HelperText>
        <TextInput
          label="Last Name"
          mode="outlined"
          style={styles.input}
          error={lastNameEmpty}
          value={lastName}
          onChangeText={(text) => setLastName(text)}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <HelperText style={{ textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25 }} type="error" visible={lastNameEmpty}>
          Enter your last name
        </HelperText>
        <TextInput
          label="Email"
          mode="outlined"
          keyboardType="email-address"
          style={styles.input}
          error={emailEmpty}
          value={email}
          onChangeText={(text) => setEmail(text)}
          autoCapitalize="none"
        />
        <HelperText style={{ textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25 }} type="error" visible={emailEmpty}>
          Enter your email
        </HelperText>
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
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

