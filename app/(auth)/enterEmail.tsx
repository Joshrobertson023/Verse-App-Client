import { router } from 'expo-router';
import React, { useState } from 'react';
import { Keyboard, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { ActivityIndicator, HelperText, TextInput } from 'react-native-paper';
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
    const [loading, setLoading] = useState(false);
    const theme = useAppTheme();
    const [emailEmpty, setEmailEmpty] = useState(false);
    const [invalidEmail, setInvalidEmail] = useState(false);


const nextClick = async () => {
  try {
    Keyboard.dismiss();
    setEmailEmpty(false);
    setInvalidEmail(false);

    const value = (localEmail || '').trim();
    if (!value) {
      setEmailEmpty(true);
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!emailRegex.test(value)) {
      setInvalidEmail(true);
      return;
    }
    setLoginInfo({ ...loginInfo, ['email']: value });
    router.push('/createPassword');
  } catch (error) {
    console.error(error);
    alert('An error occurred while checking email availability. Please try again. | ' + error);
    setLoading(false);
  }
};


    return (
        <SafeAreaView style={styles.container}>
                    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={{...styles.centered, marginBottom: 150, paddingHorizontal: 20}}>
                <Text style={{...styles.text, marginBottom: 20}}>Enter your email:</Text>
                <TextInput keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            textContentType="emailAddress"
                            error={emailEmpty || invalidEmail}
                            label="Email" mode="outlined" style={styles.input} value={localEmail} onChangeText={(text) => {
                                setLocalEmail(text);
                                if (text) {
                                    setEmailEmpty(false);
                                    setInvalidEmail(false);
                                }
                            }} />
                <HelperText style={{textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25}} type="error" visible={emailEmpty}>
                    Enter your email
                </HelperText>
                <HelperText style={{textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25}} type="error" visible={invalidEmail}>
                    Enter a valid email address
                </HelperText>
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
                    </TouchableWithoutFeedback>
        </SafeAreaView>
    )
}