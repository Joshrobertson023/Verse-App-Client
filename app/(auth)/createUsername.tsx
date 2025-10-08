import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Dialog, Portal, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import checkUsernameAvailable from '../db';
import { useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function CreateUsernameScreen() {
  const styles = useStyles();
  const loginInfo = useAppStore((state) => state.loginInfo);
  const firstName = loginInfo?.firstName;
  const lastName = loginInfo?.lastName;
  const setLoginInfo = useAppStore((state) => state.setLoginInfo);
  const [errorMessage, setErrorMessage] = useState('');
  const [username, setUsername] = useState('');
  const [systemSetUsername, setSystemSetUsername] = useState(true);
  const [loading, setLoading] = useState(false);
  const theme = useAppTheme();
  const [dialogVisible, setDialogVisible] = useState(false);

  
  const hideDialog = () => setDialogVisible(false);

const suggestUsername = () => {
    let username = '';
    username = username + (firstName?.trim() || ''); 
    username = username + (lastName?.toLowerCase().trim() || '');
    username = username + ((Math.floor(Math.random() * (100 - 1) + 1)).toString());
    return username;
};

useEffect(() => {
    const newUsername = suggestUsername();
    setUsername(newUsername.trim());
    setSystemSetUsername(true);
}, []);

const handleTextChange = (field: string, text: string) => {
    if (systemSetUsername) {
        setSystemSetUsername(false);
        setUsername('');
    } else {
        setUsername(text);
    }
    if (errorMessage.includes('enter all fields')) setErrorMessage('');
};

const nextClick = async () => {
    try {
        Keyboard.dismiss();
        setLoading(true);

        if (!username) {
            setErrorMessage('Please enter all fields');
            setLoading(false);
            return;
        }
    
        const usernameAvailable = await checkUsernameAvailable(username); 
        if (!usernameAvailable) {
            setDialogVisible(true);
            setLoading(false);
            return;
        }
        setLoading(false);
        
        setLoginInfo({ ...loginInfo, ['username']: username.trim() });
        router.push('/enterEmail');
    } catch (error) {
        console.error(error);
        alert('An error occurred while checking username availability. Please try again. | ' + error);
        setLoading(false);
        return;
    }
};


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
                <TextInput label="Username" mode="outlined" style={styles.input} value={username} onChangeText={(text) => handleTextChange('username', text)} />
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