import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import { createUser, loginUser } from '../db';
import { useAppStore, User } from '../store';
import getStyles from '../styles';
import getAppTheme from '../theme';

export default function CreatePasswordScreen() {
  const styles = getStyles();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = getAppTheme();
  const loginInfo = useAppStore.getState().loginInfo;
  const setUser = useAppStore((state) => state.setUser);

const nextClick = async () => {
    try {
        Keyboard.dismiss();

        setLoading(true);

        if (!password || !confirmPassword) {
            setErrorMessage('Please enter all fields');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match');
            setLoading(false);
            return;
        }

        const newUser: User = {
            username: loginInfo?.username || '',
            email: loginInfo?.email || '',
            firstName: loginInfo?.firstName || '',
            lastName: loginInfo?.lastName || '',
            hashedPassword: password, // todo: hash password
            streak: [],
        }

        await createUser(newUser);
        const loggedInUser = await loginUser(newUser);
        setUser(loggedInUser);
        await SecureStore.setItemAsync('userToken', loggedInUser.authToken || '');
        console.log(loggedInUser);
        console.log('set user token: ' + loggedInUser.authToken || '');
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
                <Logo />
            <View style={{...styles.centered, marginBottom: 40}}>
                <Text style={{...styles.text, marginBottom: 20}}>Create a Password:</Text>
                <TextInput keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            textContentType="password" label="Password" mode="outlined" style={styles.input} value={password}
                            onChangeText={(text) => setPassword(text)} />
                <TextInput keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            textContentType="password" label="Confirm Password" mode="outlined" style={styles.input} value={confirmPassword} 
                            onChangeText={(text) => setConfirmPassword(text)} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_outlined, marginTop: 12}} onPress={() => {nextClick()}}>
                    {loading ? (
                        <Text style={styles.buttonText_outlined}>
                            <ActivityIndicator animating={true} color={theme.colors.onBackground} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_outlined}>Create Account</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}