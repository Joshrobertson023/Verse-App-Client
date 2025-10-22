import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import checkUsernameAvailable, { getUserCollections, getUserPasswordHash, loginUser } from '../db';
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
        loggedInUser.streakLength = 0; // Change to functions in store that do it automatically on user set
        loggedInUser.versesMemorized = 0;
        loggedInUser.versesOverdue = 0;
        loggedInUser.numberPublishedCollections = 0;
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
                            textContentType="password" label="Password" mode="outlined" style={styles.input} value={password} 
                            onChangeText={(text) => handleTextChange('password', text)} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_filled, marginTop: 12}} onPress={() => {nextClick()}}>
                    {loading ? (
                        <Text style={styles.buttonText_filled}>
                            <ActivityIndicator animating={true} color={theme.colors.background} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_filled}>Login</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}