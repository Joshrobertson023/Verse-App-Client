import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/backButton';
import checkUsernameAvailable, { getUserPasswordHash, loginUser } from '../db';
import { useAppStore, User } from '../store';
import getStyles from '../styles';
import getAppTheme from '../theme';

export default function LoginScreen() {
  const styles = getStyles();
  const loginInfo = useAppStore((state) => state.loginInfo);
  const password = loginInfo?.password;
  const username = loginInfo?.username;
  const setLoginInfo = useAppStore((state) => state.setLoginInfo);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = getAppTheme();
  const currentLoginInfo = useAppStore.getState().loginInfo;
  const user = useAppStore((state) => state.user) ?? { username: '' };
    const setUser = useAppStore((state) => state.setUser);

const handleTextChange = useCallback((field: string, text: string) => {    
    setLoginInfo({ ...loginInfo, [field]: text });
    
    if (errorMessage.includes('enter all fields')) setErrorMessage('');
}, [setLoginInfo, loginInfo, errorMessage, setErrorMessage]);

const nextClick = useCallback(async () => {
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
        setUser(loggedInUser);
        // Add auth token to local storage
        // Create logic for logging user in with token on app start
        setLoading(false);
        router.push('/');
    } catch (error) {
        console.error(error);
        alert('An error occurred while checking email availability. Please try again. | ' + error);
        setLoading(false);
        return;
    }
}, [currentLoginInfo, setLoading, setErrorMessage, loginInfo]);


    return (
        <SafeAreaView style={styles.container}>
            <BackButton title="VerseVault" />
            <View style={{...styles.centered, marginBottom: 40}}>
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
                            textContentType="password" label="Password" mode="outlined" style={styles.input} value={password} 
                            onChangeText={(text) => handleTextChange('password', text)} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_outlined, marginTop: 12}} onPress={() => {nextClick()}}>
                    {loading ? (
                        <Text style={styles.buttonText_outlined}>
                            <ActivityIndicator animating={true} color={theme.colors.onBackground} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_outlined}>Login</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}