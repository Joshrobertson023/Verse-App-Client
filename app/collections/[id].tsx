import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useLayoutEffect } from 'react';
import { Text, View } from 'react-native';
import { useAppStore } from '../store';
import getStyles from '../styles';

export default function Index() {
  const styles = getStyles();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);
  const params = useLocalSearchParams();

    const collection = useAppStore((state) =>
        state.collections.find((c) => c.id?.toString() === params.id)
  );

    const navigation = useNavigation();

    useLayoutEffect(() => {
      if (collection) {
        navigation.setOptions({
          title: collection.title,
        });
      }
    }, [collection]);

  return (
    <View style={styles.container}>
      {collection?.userVerses.map((userVerse) => (
              <Text style={styles.text} key={collection.id}>{userVerse.readableReference}</Text>
            ))}
    </View>
  );
}