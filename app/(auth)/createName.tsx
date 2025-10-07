import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import { useAppStore } from '../store';
import getStyles from '../styles';

export default function CreateNameScreen() {
  const styles = getStyles();
  const loginInfo = useAppStore((state) => state.loginInfo);
  const firstName = loginInfo?.firstName;
  const lastName = loginInfo?.lastName;
  const setLoginInfo = useAppStore((state) => state.setLoginInfo);
  const [errorMessage, setErrorMessage] = useState('');
  const currentLoginInfo = useAppStore.getState().loginInfo;

  const handleTextChange = (field: string, text: string) => {
    setLoginInfo({ ...loginInfo, [field]: text });
    if (errorMessage.includes('enter all fields')) setErrorMessage('');
  }

  const nextClick = () => {
    const firstName = currentLoginInfo?.firstName.trim();
    const lastName = currentLoginInfo?.lastName.trim();

    if (!firstName || !lastName) {
      setErrorMessage('Please enter all fields');
      return;
    }

    router.push('/createUsername');
  }


    return (
        <SafeAreaView style={styles.container}>
                <Logo />
            <View style={{...styles.centered, marginBottom: 40}}>
                <Text style={{...styles.text, marginBottom: 20}}>Welcome! What's your name?</Text>
                <TextInput label="First Name" mode="outlined" style={styles.input} value={firstName} onChangeText={(text) => handleTextChange('firstName', text)} />
                <TextInput label="Last Name" mode="outlined" style={styles.input} value={lastName} onChangeText={(text) => handleTextChange('lastName', text)}/>
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_outlined, marginTop: 12}} onPress={() => {nextClick()}}>
                    <Text style={styles.buttonText_outlined}>Next</Text>
                </TouchableOpacity>
                <Link href="/(auth)/login" style={{marginTop: 20}}>
                    <Text style={styles.tinyText}>Already have an account?</Text>
                </Link>
            </View>
        </SafeAreaView>
    )
}