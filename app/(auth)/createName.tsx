import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Keyboard, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import { useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function CreateNameScreen() {
  const styles = useStyles();
  const loginInfo = useAppStore((state) => state.loginInfo);
  const setLoginInfo = useAppStore((state) => state.setLoginInfo);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [firstNameEmpty, setFirstNameEmpty] = useState(false);
  const [lastNameEmpty, setLastNameEmpty] = useState(false);
  const theme = useAppTheme();

  const nextClick = () => {
    Keyboard.dismiss();

    if (!firstName.trim() || !lastName.trim()) {
      setFirstNameEmpty(!firstName.trim());
      setLastNameEmpty(!lastName.trim());
      return;
    }

    setLoginInfo({ ...loginInfo, firstName: firstName.trim(), lastName: lastName.trim() });

    router.push('/createUsername');
  };


    return (
        <SafeAreaView style={styles.container}>
                    <Logo />
                    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={{...styles.centered, marginBottom: 0, paddingHorizontal: 20}}>
                <Text style={{...styles.startupText, marginBottom: 30}}>Create an Account</Text>
                <TextInput label="First Name" mode="outlined" style={styles.input} value={firstName}
                    error={firstNameEmpty}
                    onChangeText={(text) => {
                        setFirstName(text);
                        if (errorMessage.includes('enter all fields')) setErrorMessage('');
                        if (text) setFirstNameEmpty(false);
                    }} />
                <HelperText style={{textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25}} type="error" visible={firstNameEmpty}>
                    Enter your first name
                </HelperText>
                <TextInput label="Last Name" mode="outlined" style={styles.input} value={lastName}
                    error={lastNameEmpty}
                    onChangeText={(text) => {
                        setLastName(text);
                        if (errorMessage.includes('enter all fields')) setErrorMessage('');
                        if (text) setLastNameEmpty(false);
                    }} />
                <HelperText style={{textAlign: 'left', width: '100%', marginTop: -15, marginBottom: -5, height: 25}} type="error" visible={lastNameEmpty}>
                    Enter your last name
                </HelperText>
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_filled, marginTop: 12}} onPress={() => {nextClick()}}>
                    <Text style={styles.buttonText_filled}>Next</Text>
                </TouchableOpacity>
                <Text style={{...styles.tinyText, marginTop: 20}}>Already have an account?</Text>
                <Link href="/(auth)/login" style={{marginTop: 0, paddingVertical: 10}}>
                    <Text style={{...styles.tinyText, color: theme.colors.primary, textDecorationLine: 'underline'}}>Log In</Text>
                </Link>
                    </View>
                    </TouchableWithoutFeedback>
        </SafeAreaView>
    )
}