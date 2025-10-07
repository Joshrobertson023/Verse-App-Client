import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Dialog, Portal, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import checkUsernameAvailable from '../db';
import { useAppStore } from '../store';
import getStyles from '../styles';
import getAppTheme from '../theme';

export default function CreateUsernameScreen() {
  const styles = getStyles();
  const loginInfo = useAppStore((state) => state.loginInfo);
  const username = loginInfo?.username;
  const firstName = loginInfo?.firstName;
  const lastName = loginInfo?.lastName;
  const setLoginInfo = useAppStore((state) => state.setLoginInfo);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestedUsername, setSuggestedUsername] = useState('');
  const currentLoginInfo = useAppStore.getState().loginInfo;
  const [systemSetUsername, setSystemSetUsername] = useState(true);
  const [loading, setLoading] = useState(false);
  const theme = getAppTheme();
  const [dialogVisible, setDialogVisible] = useState(false);

  
  const hideDialog = useCallback(() => setDialogVisible(false), [setDialogVisible]);

const suggestUsername = useCallback(() => {
    let username = '';
    // Use optional chaining just in case
    username = username + (firstName?.trim() || ''); 
    username = username + (lastName?.toLowerCase().trim() || '');
    username = username + ((Math.floor(Math.random() * (100 - 1) + 1)).toString());
    return username;
}, [firstName, lastName]);

useEffect(() => {
    // Only run on mount, as desired by the original code, 
    // but React requires including dependencies used in the effect.
    // Since setLoginInfo and suggestUsername are defined in the component scope, 
    // they must be included.
    const newUsername = suggestUsername();
    setSuggestedUsername(newUsername.trim());
    setSystemSetUsername(true);
    setLoginInfo({...loginInfo, ['username']: newUsername.trim()});
}, [suggestUsername, setLoginInfo]);

const handleTextChange = useCallback((field: string, text: string) => {
    if (systemSetUsername) {
        setSystemSetUsername(false);
        setSuggestedUsername('');
    } else {
        setSuggestedUsername(text);
    }
    setLoginInfo({ ...loginInfo, [field]: text.trim() });
    
    if (errorMessage.includes('enter all fields')) setErrorMessage('');
}, [systemSetUsername, setSystemSetUsername, setSuggestedUsername, setLoginInfo, loginInfo, errorMessage, setErrorMessage]);

const nextClick = useCallback(async () => {
    try {
        Keyboard.dismiss();
        setLoading(true);
        // currentLoginInfo is from getState(), so it's a dependency
        const username = currentLoginInfo?.username.trim();
    
        if (!username) {
            setErrorMessage('Please enter all fields');
            setLoading(false); // Make sure to turn off loading on error path
            return;
        }
    
        // checkUsernameAvailable is an imported function, usually stable, but include it if you're not sure
        const usernameAvailable = await checkUsernameAvailable(username); 
        if (!usernameAvailable) {
            setDialogVisible(true);
            setLoading(false);
            return;
        }
        setLoading(false);
        // router.push is an imported function, usually stable, but include it if you're not sure
        router.push('/enterEmail');
    } catch (error) {
        console.error(error);
        alert('An error occurred while checking username availability. Please try again. | ' + error);
        setLoading(false);
        return;
    }
}, [currentLoginInfo, setLoading, setErrorMessage, setDialogVisible, router.push]);


    return (
        <SafeAreaView style={styles.container}>
                <Logo />
            <View style={{...styles.centered, marginBottom: 40}}>
                <Portal>
                <Dialog style={{backgroundColor: theme.colors.background, outlineWidth: 2, outlineColor: theme.colors.onBackground, zIndex: 10}} visible={dialogVisible} onDismiss={hideDialog}>
                    <Dialog.Content>
                        <Text style={styles.tinyText}>The username you entered is already taken. Please try a different one.</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity onPress={hideDialog} style={{...styles.button_filled, backgroundColor: theme.colors.background, marginTop: 12}}>
                            <Text style={styles.buttonText_outlined}>OK</Text>
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>
                </Portal>
                <Text style={{...styles.text, marginBottom: 20}}>Let's create a username:</Text>
                <TextInput label="Username" mode="outlined" style={styles.input} value={suggestedUsername} onChangeText={(text) => handleTextChange('username', text)} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_outlined, marginTop: 12}} onPress={() => {nextClick()}}>
                    {loading ? (
                        <Text style={styles.buttonText_outlined}>
                            <ActivityIndicator animating={true} color={theme.colors.onBackground} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_outlined}>Next</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}