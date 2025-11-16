import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Keyboard, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { ActivityIndicator, HelperText, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPasswordResetOtp } from '../db';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function ForgotPasswordScreen() {
  const styles = useStyles();
  const theme = useAppTheme();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameEmpty, setUsernameEmpty] = useState(false);
  const [emailEmpty, setEmailEmpty] = useState(false);

  const handleSubmit = async () => {
    try {
      Keyboard.dismiss();
      setLoading(true);
      setSuccessMessage('');

      if (!username.trim() || !email.trim()) {
        setUsernameEmpty(!username.trim());
        setEmailEmpty(!email.trim());
        Alert.alert(
          'Missing information',
          'Please complete all fields.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      await requestPasswordResetOtp(username.trim(), email.trim());

      setSuccessMessage('A verification code has been sent to your email.');
      setTimeout(() => {
        router.push({
          pathname: '/(auth)/resetPassword',
          params: { username: username.trim() },
        });
      }, 750);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset code.';
      Alert.alert('Unable to send code', message, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ ...styles.centered, marginBottom: 150, paddingHorizontal: 20 }}>
        <Text style={{ ...styles.text, marginBottom: 20 }}>Forgot Password</Text>
        <TextInput
          label="Username"
          mode="outlined"
          style={styles.input}
          error={usernameEmpty}
          value={username}
          onChangeText={(text) => setUsername(text)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <HelperText style={{ textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25 }} type="error" visible={usernameEmpty}>
          Enter your username
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
            <Text style={styles.buttonText_filled}>Send Code</Text>
          )}
        </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

