import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/logo';
import { useAppStore } from '../store';
import getStyles from '../styles';

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

  function suggestUsername() {
    let username = '';
    username = username + firstName;
    username = username + lastName.toLowerCase();
    username = username + ((Math.floor(Math.random() * (100 - 1) + 1)).toString());
    return username;
  }

  useEffect(() => {
      const newUsername = suggestUsername();
      setSuggestedUsername(newUsername);
      setSystemSetUsername(true);
      setLoginInfo({...loginInfo, ['username']: newUsername});
    }, []);

  const handleTextChange = (field: string, text: string) => {
    if (systemSetUsername) {
        setSuggestedUsername('');
        setSystemSetUsername(false);
    } else {
        setSuggestedUsername(text);
        setLoginInfo({ ...loginInfo, [field]: text });
    }
    if (errorMessage.includes('enter all fields')) setErrorMessage('');
  }

  const nextClick = () => {
    const username = currentLoginInfo?.username.trim();

    if (!username) {
      setErrorMessage('Please enter all fields');
      return;
    }
  }


    return (
        <SafeAreaView style={styles.container}>
                <Logo />
            <View style={{...styles.centered, marginBottom: 40}}>
                <Text style={{...styles.text, marginBottom: 20}}>Let's create a username:</Text>
                <TextInput label="Username" mode="outlined" style={styles.input} value={suggestedUsername} onChangeText={(text) => handleTextChange('username', text)} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_outlined, marginTop: 12}} onPress={() => {nextClick()}}>
                    <Text style={styles.buttonText_outlined}>Next</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}