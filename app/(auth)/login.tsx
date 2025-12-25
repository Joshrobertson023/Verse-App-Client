import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Alert, Keyboard, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import checkUsernameAvailable, { checkIfBanned, getActiveBan, getStreakLength, getUserCollections, getUserPasswordHash, loginUser } from '../db';
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
  const [usernameEmpty, setUsernameEmpty] = useState(false);
const [passwordEmpty, setPasswordEmpty] = useState(false);

const handleTextChange = (field: string, text: string) => {    
    setLoginInfo({ ...loginInfo, [field]: text });
    
    if (errorMessage.includes('enter all fields')) {
        setErrorMessage('');
        setUsernameEmpty(false);
        setPasswordEmpty(false);
    }
};

const nextClick = async () => {
    try {
        Keyboard.dismiss();

        const username = currentLoginInfo?.username;

        setLoading(true);

        if (!username || !password) {
            setErrorMessage('Please enter all fields');
            if (!password)
                setPasswordEmpty(true);
            if (!username)
                setUsernameEmpty(true);
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

        console.log("checking username available");
        const usernameAvailable = await checkUsernameAvailable(username); 
        if (usernameAvailable) {
            Alert.alert(
              'Error logging in ',
              'Username does not exist.',
              [
                { text: 'OK', onPress: () => console.log('OK Pressed') }
              ]
            );
            setLoading(false);
            return;
        }
        console.log("checking password hash");

        const hashedPassword = await getUserPasswordHash(username);
        if (hashedPassword !== password.trim()) {
            Alert.alert(
              'Error logging in ',
              'Password is incorrect.',
              [
                { text: 'OK', onPress: () => console.log('OK Pressed') }
              ]
            );
            setLoading(false);
            return;
        }

        console.log("checking if banned");
        // Check if user is banned before logging in
        const isBanned = await checkIfBanned(username);
        if (isBanned) {
            const activeBan = await getActiveBan(username);
            setLoading(false);
            router.push({
                pathname: '/(auth)/banned',
                params: {
                    reason: activeBan?.reason || 'Your account has been banned.',
                    banDate: activeBan?.banDate || new Date().toISOString(),
                    banExpireDate: activeBan?.banExpireDate || null
                }
            });
            return;
        }

        console.log("logging in user");
        const loggedInUser = await loginUser(newUser);
        console.log("logged in.");
        // Fetch streakLength from API
        try {
            console.log("getting streak length");
          loggedInUser.streakLength = await getStreakLength(loggedInUser.username);
        } catch (error) {
          console.error('Failed to fetch streak length:', error);
          loggedInUser.streakLength = 0;
        }
        console.log('got streak length')
        // versesMemorized, versesOverdue, and numberPublishedCollections come from the database
        setUser(loggedInUser);
        console.log("getting user collections");
        setCollections(await getUserCollections(loggedInUser.username));
        console.log(loggedInUser);

        console.log('storing user token');
        await SecureStore.setItemAsync('userToken', loggedInUser.authToken || '');

        console.log('stored user token');
        setLoading(false);
        router.push('/');
    } catch (error) {
        console.error(error);
        alert('An error occurred while logging in. Please try again. | ' + error);
        setLoading(false);
        return;
    }
};


    return (
        <SafeAreaView style={styles.container}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={{...styles.centered, marginBottom: 150, width: '100%', paddingHorizontal: 20 }}>
                    <Text style={{...styles.text, marginBottom: 20}}>Login to Your Account:</Text>
                    <TextInput keyboardType="default"
                                autoCapitalize="none"
                                autoCorrect={false}
                                error={usernameEmpty}
                                label="Username" mode="outlined" style={styles.input} value={username}
                                onChangeText={(text) => handleTextChange('username', text)} />
                    <HelperText style={{textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25}} type="error" visible={usernameEmpty}>
                        Enter your username
                    </HelperText>
                    <TextInput keyboardType="default"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="password"
                                textContentType="password"
                                error={passwordEmpty}
                                secureTextEntry={!showPassword}
                                label="Password" mode="outlined" style={{...styles.input}} value={password} 
                                right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} style={{marginTop: 5}} onPress={() => setShowPassword((prev) => !prev)} />}
                                onChangeText={(text) => handleTextChange('password', text)} />
                    <HelperText style={{textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25}} type="error" visible={passwordEmpty}>
                        Enter your password
                    </HelperText>
                    <Button 
                      title="Login" 
                      onPress={() => {nextClick()}} 
                      variant="filled"
                      loading={loading}
                      style={{ marginTop: 12, width: '100%' }}
                    />
                    <View style={{ marginTop: 20, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => router.push('/(auth)/forgotUsername')}>
                            <Text style={{ ...styles.tinyText, color: theme.colors.primary, marginBottom: 14 }}>Forgot Username</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/(auth)/forgotPassword')}>
                            <Text style={{ ...styles.tinyText, color: theme.colors.primary }}>Forgot Password</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                </TouchableWithoutFeedback>
        </SafeAreaView>
    )
}