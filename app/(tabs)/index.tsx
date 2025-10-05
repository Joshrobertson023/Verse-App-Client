import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { useAppStore } from '../store';
import getStyles from '../styles';

export default function Index() {
  const styles = getStyles();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);

  return (
    <View style={styles.container}>
    <View style={styles.collectionsContainer}>

      {collections.map((c) => (
        <TouchableOpacity
          key={c.id}
          onPress={() => alert('Pressed')}
        >
          <View style={styles.collectionItem}>
            <Text style={styles.text} key={c.id}>{c.title}</Text>
          </View>
        </TouchableOpacity>
      ))}


    </View>
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('../collections/addnew')}
      />
    </View>
  );
}