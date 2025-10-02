import { useAuth } from '@/context/AuthContext';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Login() {
  const { signin, session, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if(session) return <Redirect href="/"/>

    const handleSignIn = async () => {
    await signin(username, password);
    // No need to manually navigate — once `session` changes, useEffect redirects automatically
  };

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
      <Text style={styles.text}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonText}>Sign In</Text>
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
  input: {
    width: '100%',
    backgroundColor: '#444',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: 'transparent',
    borderColor: '#EAE9FC',
    borderWidth: 2,
    borderRadius: 20,
    height: 40,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#EAE9FC',
    fontSize: 16,
  },
});