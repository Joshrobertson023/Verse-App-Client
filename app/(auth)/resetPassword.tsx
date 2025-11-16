import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Keyboard, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPasswordWithOtp, verifyPasswordResetOtp } from '../db';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function ResetPasswordScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ username?: string }>();

  const username = useMemo(() => (params?.username ?? '').toString(), [params?.username]);

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpStatus, setOtpStatus] = useState<'unverified' | 'verifying' | 'verified'>('unverified');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleVerifyOtp = async () => {
    try {
      Keyboard.dismiss();
      setIsError(false);
      setMessage('');

      if (!username.trim() || !otp.trim()) {
        Alert.alert('Missing information', 'Please enter the verification code.', [{ text: 'OK' }]);
        return;
      }

      setOtpStatus('verifying');

      const result = await verifyPasswordResetOtp(username.trim(), otp.trim());
      if (!result.valid) {
        Alert.alert(
          'Invalid code',
          result.reason === 'expired' ? 'This code has expired. Please request a new one.' : 'The code you entered is incorrect.',
          [{ text: 'OK' }]
        );
        setOtpStatus('unverified');
        return;
      }

      setOtpStatus('verified');
      setMessage('Code verified. Please enter your new password.');
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Failed to verify code.';
      Alert.alert('Verification failed', errMessage, [{ text: 'OK' }]);
      setOtpStatus('unverified');
    }
  };

  const handleResetPassword = async () => {
    try {
      Keyboard.dismiss();
      setIsError(false);
      setMessage('');

      if (otpStatus !== 'verified') {
        Alert.alert('Verify code', 'Please verify your code first.', [{ text: 'OK' }]);
        return;
      }

      if (!newPassword.trim() || !confirmPassword.trim()) {
        Alert.alert('Missing information', 'Please fill out both password fields.', [{ text: 'OK' }]);
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert('Mismatch', 'Passwords do not match.', [{ text: 'OK' }]);
        return;
      }

      if (newPassword.length < 11) {
        Alert.alert('Password too short', 'Password must be at least 11 characters long.', [{ text: 'OK' }]);
        return;
      }

      setSubmitting(true);

      await resetPasswordWithOtp(username.trim(), otp.trim(), newPassword);

      setMessage('Password updated. You can now log in.');
      setIsError(false);

      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1000);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Failed to reset password.';
      Alert.alert('Reset failed', errMessage, [{ text: 'OK' }]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ ...styles.centered, marginBottom: 150, paddingHorizontal: 20 }}>
        <Text style={{ ...styles.text, marginBottom: 20 }}>Reset Password</Text>

        <TextInput
          label="Verification Code"
          mode="outlined"
          style={styles.input}
          value={otp}
          onChangeText={(text) => setOtp(text)}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={{ ...styles.button_outlined, marginBottom: 12 }}
          onPress={handleVerifyOtp}
          disabled={otpStatus === 'verifying'}
        >
          {otpStatus === 'verifying' ? (
            <Text style={styles.buttonText_outlined}>
              <ActivityIndicator animating={true} color={theme.colors.onBackground} />
            </Text>
          ) : (
            <Text style={styles.buttonText_outlined}>Verify Code</Text>
          )}
        </TouchableOpacity>

        {otpStatus === 'verified' ? (
          <>
            <TextInput
              label="New Password"
              mode="outlined"
              style={styles.input}
              value={newPassword}
              onChangeText={(text) => setNewPassword(text)}
              autoCapitalize="none"
              secureTextEntry={!showNewPassword}
              right={
                <TextInput.Icon
                  icon={showNewPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowNewPassword((prev) => !prev)}
                />
              }
            />
            <TextInput
              label="Confirm Password"
              mode="outlined"
              style={styles.input}
              value={confirmPassword}
              onChangeText={(text) => setConfirmPassword(text)}
              autoCapitalize="none"
              secureTextEntry={!showConfirmPassword}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                />
              }
            />
          </>
        ) : null}

        {message ? (
          <Text
            style={{
              ...styles.tinyText,
              color: isError ? theme.colors.error : theme.colors.primary,
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            {message}
          </Text>
        ) : null}

        {otpStatus === 'verified' ? (
          <TouchableOpacity
            style={{ ...styles.button_filled, marginTop: 12 }}
            onPress={handleResetPassword}
            disabled={submitting}
          >
            {submitting ? (
              <Text style={styles.buttonText_filled}>
                <ActivityIndicator animating={true} color={theme.colors.background} />
              </Text>
            ) : (
              <Text style={styles.buttonText_filled}>Update Password</Text>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.replace('/(auth)/login')}>
          <Text style={{ ...styles.tinyText, color: theme.colors.primary }}>Back to Login</Text>
        </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

