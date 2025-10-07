import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import getStyles from '../styles';

export default function BibleScreen() {
  const styles = getStyles();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.text}>This area is currently under construction.</Text>
        </SafeAreaView>
    )
}