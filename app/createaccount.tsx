import { useAuth } from '@/context/AuthContext';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import colors from './colors';
import styles from './styles';

export default function CreateAccount() {
  const { signin, session, loading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [blank, setBlank] = useState(false);
  const [error, setError] = useState('');

  const clickNext = () => {
    if (firstName.trim() === '' || lastName.trim() === ''
        || username.trim() === '' || email.trim() === '') {
            setBlank(true);
            setError('Please enter all fields.');
            return;
        }
    router.push({
        pathname: '/createpassword',
        params: {
            firstName,
            lastName,
            email,
            username,
        }
    });
  }

  const getRandomUsername = () => {
    const randomNumber = Math.floor(Math.random() * (90)) + 10;
    const first = firstName.trim();
    const last = lastName.trim();
    return `${first}${last}${randomNumber}`;
  }

  const generateRandomUsername = () => {
    const newUsername = getRandomUsername();
    setUsername(newUsername);
    setIsGenerated(true);
  }

  const handleUsernameChange = (text: string) => {
    if (isGenerated && text.length < username.length) {
        setUsername('');
        setIsGenerated(false);
    } else {
        setUsername(text);
        if (text.length > 0 && text.length > username.length) {
            setIsGenerated(false);
        }
    }
  }

  if(session) return <Redirect href="/"/>

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
      <Text style={styles.subheading}>Create Your Account</Text>

      <TextInput
        placeholder="Enter your first name..."
        label="First Name"
        value={firstName}
        style={styles.input}
        placeholderTextColor={colors.primaryWhite}
        activeOutlineColor={colors.primaryWhite}
        outlineColor={blank ? colors.error : colors.transparent}
        textColor={colors.primaryWhite}
        mode="outlined"
        theme={{ 
          colors: {
            onSurfaceVariant: colors.primaryWhite, 
          } 
        }}
        onChangeText={(text) => {
          setFirstName(text);
          if (blank && text.trim() !== '') {
            setBlank(false);
          }
        }}
      />
      <TextInput
        placeholder="Enter your last name..."
        label="Last Name"
        value={email}
        style={styles.input}
        placeholderTextColor={colors.primaryWhite}
        activeOutlineColor={colors.primaryWhite}
        outlineColor={blank ? colors.error : colors.transparent}
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
        placeholder="Email"
        label="Email"
        value={email}
        style={styles.input}
        placeholderTextColor={colors.primaryWhite}
        activeOutlineColor={colors.primaryWhite}
        outlineColor={blank ? colors.error : colors.transparent}
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
        placeholder="Email"
        label="Email"
        value={email}
        style={styles.input}
        placeholderTextColor={colors.primaryWhite}
        activeOutlineColor={colors.primaryWhite}
        outlineColor={blank ? colors.error : colors.transparent}
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

      {error ? <Text style={styles.errorMessage}>{error}</Text> : null }

      <TouchableOpacity style={styles.button_filled} onPress={clickNext}>
        <Text style={styles.buttonText_filled}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}
