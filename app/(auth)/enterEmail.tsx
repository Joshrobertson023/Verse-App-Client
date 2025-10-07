import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import { useAppStore } from '../store';
import getStyles from '../styles';
import getAppTheme from '../theme';

export default function EnterEmailScreen() {
      const styles = getStyles();
    const loginInfo = useAppStore((state) => state.loginInfo);
const setLoginInfo = useAppStore((state) => state.setLoginInfo);
    
    // Destructure the values from loginInfo
    const email = loginInfo?.email;

    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const theme = getAppTheme();

const handleTextChange = useCallback((field: string, text: string) => {
  setLoginInfo({ ...loginInfo, [field]: text });
  if (errorMessage.includes('enter all fields')) setErrorMessage('');
}, [loginInfo, errorMessage]);


const nextClick = useCallback(async () => {
  try {
    Keyboard.dismiss();
    router.push('/createPassword');
  } catch (error) {
    console.error(error);
    alert('An error occurred while checking email availability. Please try again. | ' + error);
    setLoading(false);
  }
}, []);


    return (
        <SafeAreaView style={styles.container}>
                <Logo />
            <View style={{...styles.centered, marginBottom: 40}}>
                <Text style={{...styles.text, marginBottom: 20}}>Enter your email:</Text>
                <TextInput keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            textContentType="emailAddress" label="Email" mode="outlined" style={styles.input} value={email} onChangeText={(text) => handleTextChange('email', text)} />
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