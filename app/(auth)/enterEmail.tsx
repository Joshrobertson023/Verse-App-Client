import { router } from 'expo-router';
import React, { useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function EnterEmailScreen() {
    const styles = useStyles();
    const loginInfo = useAppStore((state) => state.loginInfo);
    const setLoginInfo = useAppStore((state) => state.setLoginInfo);
    const email = loginInfo?.email;
    const [localEmail, setLocalEmail] = useState(email);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const theme = useAppTheme();


const nextClick = async () => {
  try {
    Keyboard.dismiss();
    if (errorMessage.includes('enter all fields')) setErrorMessage('');
    setLoginInfo({ ...loginInfo, ['email']: localEmail.trim() });
    router.push('/createPassword');
  } catch (error) {
    console.error(error);
    alert('An error occurred while checking email availability. Please try again. | ' + error);
    setLoading(false);
  }
};


    return (
        <SafeAreaView style={styles.container}>
            <View style={{...styles.centered, marginBottom: 150}}>
                <Text style={{...styles.text, marginBottom: 20}}>Enter your email:</Text>
                <TextInput keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            textContentType="emailAddress" label="Email" mode="outlined" style={styles.input} value={localEmail} onChangeText={(text) => setLocalEmail(text)} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_filled, marginTop: 12}} onPress={() => {nextClick()}}>
                    {loading ? (
                        <Text style={styles.buttonText_filled}>
                            <ActivityIndicator animating={true} color={theme.colors.background} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_filled}>Next</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}