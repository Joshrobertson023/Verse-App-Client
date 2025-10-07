import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../store';
import getStyles from '../styles';

export default function ProfileScreen() {
  const styles = getStyles();
  const setUser = useAppStore((state) => state.setUser);

  const logoutClick = () => {
    setUser(null);
    router.replace('/(auth)/createName');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button_text} onPress={logoutClick}>
        <Text style={styles.buttonText_outlined}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}