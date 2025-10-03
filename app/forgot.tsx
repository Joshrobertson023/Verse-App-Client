import { useAuth } from '@/context/AuthContext';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function Forgot() {
  const { signin, session, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  if(session) return <Redirect href="/"/>

  const forgotUsername = async () => {

  };

  const forgotPassword = () => {

  }

    if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#EAE9FC" />
        <Text style={styles.text}>Signing in...</Text>
      </View>
    );
  }

 return (
    <View style={styles.container}>

      <TouchableOpacity style={[styles.button_outlined, styles.signinButton]} onPress={forgotUsername}>
        <Text style={styles.buttonText_outlined}>Forgot Username</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={forgotPassword} style={styles.button_filled}>
        <Text style={styles.buttonText_filled}>Forgot Password</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33302F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  text: {
    color: '#EAE9FC',
    fontSize: 22,
    marginBottom: 16,
  },
  headline: {
    color: '#EAE9FC',
    fontSize: 42,
    top: -96,
  },
  input: {
    width: '100%',
    backgroundColor: '#444',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorInput: {
    borderColor: 'red',
    borderWidth: 2,
  },
  button_outlined: {
    backgroundColor: 'transparent',
    borderColor: '#EAE9FC',
    borderWidth: 2,
    borderRadius: 20,
    height: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button_filled: {
    backgroundColor: '#EAE9FC',
    borderColor: '#EAE9FC',
    borderWidth: 2,
    borderRadius: 20,
    height: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button_text: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    height: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText_filled: {
    color: '#161616ff',
    fontSize: 16,
  },
  buttonText_outlined: {
    color: '#EAE9FC',
    fontSize: 16,
  },
  signinButton: {
    marginBottom: 10,
  },
});