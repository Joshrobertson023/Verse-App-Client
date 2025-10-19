import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { loggedOutUser, useAppStore } from '../store';
import useStyles from '../styles';

export default function ProfileScreen() {
  const styles = useStyles();
  const setUser = useAppStore((state) => state.setUser);
  const setCollections = useAppStore((state) => state.setCollections);

  const logoutClick = async () => {
    setUser(loggedOutUser);
    await SecureStore.deleteItemAsync('userToken');
    setCollections([]);
    router.replace('/(auth)/createName');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button_outlined} onPress={logoutClick}>
        <Text style={styles.buttonText_outlined}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}