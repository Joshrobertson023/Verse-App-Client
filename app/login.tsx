import { useAuth } from '@/context/AuthContext';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import colors from './colors';
import styles from './styles';


export default function Login() {
  const { signin, session, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [blank, setBlank] = useState(false);
  const [error, setError] = useState('');

  if(session) return <Redirect href="/"/>

  const handleSignIn = async () => {
    if (email.trim() === '' || password.trim() === '') {
      setBlank(true);
      setError('Please fill in all fields.');
      return;
    }
    
    await signin(email, password);
  };

  const clickCreateAccount = () => {
    router.push('/createaccount');
  }

  const clickForgot = () => {
    router.push('/forgot');
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
      <Text style={styles.headline}>VerseApp</Text>

      <TextInput
        placeholder="Email"
        label="Email"
        value={email}
        style={styles.input}
        placeholderTextColor={colors.primaryWhite}
        activeOutlineColor={colors.primaryWhite}
        textColor={colors.primaryWhite}
        mode="outlined"
        theme={{ 
          colors: {
            onSurfaceVariant: colors.primaryWhite, 
          } 
        }}
        onChangeText={(text) => {
          setEmail(text);
          if (blank && text.trim() !== '') {
            setBlank(false);
          }
        }}
      />

      <TextInput
        value={password}
        placeholder="Password"
        label="Password"
        style={styles.input}
        placeholderTextColor={colors.primaryWhite}
        activeOutlineColor={colors.primaryWhite}
        textColor={colors.primaryWhite}
        mode="outlined"
        theme={{ 
          colors: {
            onSurfaceVariant: colors.primaryWhite, 
          } 
        }}
        onChangeText={(text) => {
          setPassword(text);
          if (blank && text.trim() !== '') {
            setBlank(false);
          }
        }}
      />

      {error ? <Text style={styles.errorMessage}>{error}</Text> : null}

      <TouchableOpacity onPress={handleSignIn} style={[styles.button_filled, styles.signinButton]}>
        <Text style={styles.buttonText_filled}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button_outlined} onPress={clickCreateAccount}>
        <Text style={styles.buttonText_outlined}>Create Account</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={clickForgot} style={styles.button_text}>
        <Text style={styles.buttonText_outlined}>Forgot Username/Password</Text>
      </TouchableOpacity>
    </View>
  );
}