import React, { useCallback, useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import { useAppStore } from '../store';
import getStyles from '../styles';
import getAppTheme from '../theme';

export default function CreatePasswordScreen() {
  const styles = getStyles();
  const loginInfo = useAppStore((state) => state.loginInfo);
  const password = loginInfo?.password;
  const [confirmPassword, setConfirmPassword] = useState('');
  const setLoginInfo = useAppStore((state) => state.setLoginInfo);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = getAppTheme();
  const currentLoginInfo = useAppStore.getState().loginInfo;

const handleTextChange = useCallback((field: string, text: string) => {    
    setLoginInfo({ ...loginInfo, [field]: text });
    
    // Note: setErrorMessage is used implicitly by checking errorMessage
    if (errorMessage.includes('enter all fields')) setErrorMessage('');
}, [setLoginInfo, loginInfo, errorMessage, setErrorMessage]);

const nextClick = useCallback(async () => {
    try {
        Keyboard.dismiss();

        // The currentLoginInfo variable is retrieved outside of the callback
        const password = currentLoginInfo?.password;

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

        alert('Account data: ' + JSON.stringify(loginInfo));
    } catch (error) {
        console.error(error);
        alert('An error occurred while checking email availability. Please try again. | ' + error);
        setLoading(false);
        return;
    }
}, [currentLoginInfo, confirmPassword, setLoading, setErrorMessage, loginInfo]);


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
                            onChangeText={(text) => handleTextChange('password', text)} />
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