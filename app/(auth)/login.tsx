import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import checkUsernameAvailable, { getStreakLength, getUserCollections, getUserPasswordHash, loginUser } from '../db';
import { useAppStore, User } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function LoginScreen() {
  const styles = useStyles();
  const loginInfo = useAppStore((state) => state.loginInfo);
  const password = loginInfo?.password;
  const username = loginInfo?.username;
  const setLoginInfo = useAppStore((state) => state.setLoginInfo);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useAppTheme();
  const currentLoginInfo = useAppStore.getState().loginInfo;
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const setCollections = useAppStore((state) => state.setCollections);
  const [showPassword, setShowPassword] = useState(false);

const handleTextChange = (field: string, text: string) => {    
    setLoginInfo({ ...loginInfo, [field]: text });
    
    if (errorMessage.includes('enter all fields')) setErrorMessage('');
};

const nextClick = async () => {
    try {
        Keyboard.dismiss();

        const username = currentLoginInfo?.username;

        setLoading(true);

        if (!username || !password) {
            setErrorMessage('Please enter all fields');
            setLoading(false);
            return;
        }

        const newUser: User = {
            username: currentLoginInfo?.username || '',
            hashedPassword: password.trim(), // todo: hash password
            streak: [],
            firstName: '',
            lastName: '',
            streakLength: 0,
            versesMemorized: 0,
            versesOverdue: 0,
            numberPublishedCollections: 0,
            points: 0,
        }

        const usernameAvailable = await checkUsernameAvailable(username); 
        if (usernameAvailable) {
            setErrorMessage('Username does not exist');
            setLoading(false);
            return;
        }

        const hashedPassword = await getUserPasswordHash(username);
        if (hashedPassword !== password.trim()) {
            setErrorMessage('Incorrect password');
            setLoading(false);
            return;
        }

        const loggedInUser = await loginUser(newUser);
        // Fetch streakLength from API
        try {
          loggedInUser.streakLength = await getStreakLength(loggedInUser.username);
        } catch (error) {
          console.error('Failed to fetch streak length:', error);
          loggedInUser.streakLength = 0;
        }
        // versesMemorized, versesOverdue, and numberPublishedCollections come from the database
        setUser(loggedInUser);
        setCollections(await getUserCollections(loggedInUser.username));
        console.log(loggedInUser);
        console.log('set user token: ' + loggedInUser.authToken || '');

        await SecureStore.setItemAsync('userToken', loggedInUser.authToken || '');

        setLoading(false);
        router.push('/');
    } catch (error) {
        console.error(error);
        alert('An error occurred while checking email availability. Please try again. | ' + error);
        setLoading(false);
        return;
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
                    <View style={{...styles.centered, marginBottom: 150}}>
                <Text style={{...styles.text, marginBottom: 20}}>Login to Your Account:</Text>
                <TextInput keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            label="Username" mode="outlined" style={styles.input} value={username}
                            onChangeText={(text) => handleTextChange('username', text)} />
                <TextInput keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            textContentType="password"
                            secureTextEntry={!showPassword}
                            label="Password" mode="outlined" style={styles.input} value={password} 
                            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} style={{marginTop: 25}} onPress={() => setShowPassword((prev) => !prev)} />}
                            onChangeText={(text) => handleTextChange('password', text)} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <Button 
                  title="Login" 
                  onPress={() => {nextClick()}} 
                  variant="filled"
                  loading={loading}
                  style={{ marginTop: 12 }}
                />
                <View style={{ marginTop: 16, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.push('/(auth)/forgotUsername')}>
                        <Text style={{ ...styles.tinyText, color: theme.colors.primary, marginBottom: 10 }}>Forgot Username</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/(auth)/forgotPassword')}>
                        <Text style={{ ...styles.tinyText, color: theme.colors.primary }}>Forgot Password</Text>
                    </TouchableOpacity>
                </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}