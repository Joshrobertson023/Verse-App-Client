import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import { useAppStore } from '../store';
import useStyles from '../styles';

export default function CreateNameScreen() {
  const styles = useStyles();
  const loginInfo = useAppStore((state) => state.loginInfo);
  const setLoginInfo = useAppStore((state) => state.setLoginInfo);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const nextClick = () => {
    Keyboard.dismiss();

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please enter all fields');
      return;
    }

    setLoginInfo({ ...loginInfo, firstName: firstName.trim(), lastName: lastName.trim() });

    router.push('/createUsername');
  };


    return (
        <SafeAreaView style={styles.container}>
                <Logo />
            <View style={{...styles.centered, marginBottom: 40}}>
                <Text style={{...styles.text, marginBottom: 20}}>Welcome! What's your name?</Text>
                <TextInput label="First Name" mode="outlined" style={styles.input} value={firstName} 
                    onChangeText={(text) => { 
                        setFirstName(text); 
                        if (errorMessage.includes('enter all fields')) setErrorMessage(''); 
                    }} />
                <TextInput label="Last Name" mode="outlined" style={styles.input} value={lastName} 
                    onChangeText={(text) => { 
                        setLastName(text); 
                        if (errorMessage.includes('enter all fields')) setErrorMessage(''); 
                    }} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_outlined, marginTop: 12}} onPress={() => {nextClick()}}>
                    <Text style={styles.buttonText_outlined}>Next</Text>
                </TouchableOpacity>
                <Text style={{...styles.tinyText, marginTop: 20}}>Already have an account?</Text>
                <Link href="/(auth)/login" style={{marginTop: 0, paddingVertical: 10}}>
                    <Text style={{...styles.tinyText, color: '#648dffff'}}>Sign In</Text>
                </Link>
            </View>
        </SafeAreaView>
    )
}