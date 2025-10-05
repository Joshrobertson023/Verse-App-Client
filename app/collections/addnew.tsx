import React from 'react';
import { Text, View } from 'react-native';
import { useAppStore } from '../store';
import styles from '../styles';



export default function Index() {
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);

  return (
    <View style={styles.container}>
        <Text style={styles.headline}>Add New Collection</Text>
    </View>
  );
}