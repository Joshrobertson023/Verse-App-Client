import { useAuth } from '@/context/AuthContext';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import colors from './colors';
import styles from './styles';
import User from './User';

export default function CreatePassword() {
    const params = useLocalSearchParams();
    const {firstName, lastName, email, username} = params;

    const { signin, session, loading } = useAuth();
    const router = useRouter();
        
    if(session) return <Redirect href="/"/>

    const [error, setError] = useState('');
    const [blank, setBlank] = useState(false);
    const [password, setPassword] = useState('');
    const [repeastPassword, setRepeatPassword] = useState('');

    const user = new User();

    const clickCreateAccount = async () => {
        if (password.trim() === '' || repeastPassword.trim() === '') {
            setBlank(true);
            setError('Please enter all fields.');
            return;
        }
    }

    const createUser = async () => {
        try {
            // Call API to create user
            // Call API to get user from username
            // Store token in local storage
            // Make a way to have data in memory across app
            const response = await fetch('https://localhost:7229/users/newtoken');
            const json = await response.json();
            const user = json.user;
        } catch (error) {
            setError(error);
        }
    };

    useEffect(() => {
        createUser();
    }, []);

    return (
    <View style={styles.container}>
      <Text style={styles.subheading}>Create Your Account</Text>

      <TextInput
        placeholder="Create a password"
        label="Password"
        value={password}
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
          setPassword(text);
          if (blank && text.trim() !== '') {
            setBlank(false);
          }
        }}
      />
      <TextInput
        placeholder="Re-enter your password"
        label="Re-enter password"
        value={repeastPassword}
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
          setRepeatPassword(text);
          if (blank && text.trim() !== '') {
            setBlank(false);
          }
        }}
      />

      {error ? <Text style={styles.errorMessage}>{error}</Text> : null }

      <TouchableOpacity style={styles.button_filled} onPress={clickCreateAccount}>
        <Text style={styles.buttonText_filled}>Next</Text>
      </TouchableOpacity>
    </View>
    )
}