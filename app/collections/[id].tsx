import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import UserVerseCard from '../components/userVerse';
import { useAppStore } from '../store';
import useStyles from '../styles';

export default function Index() {
  const styles = useStyles();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);
  const params = useLocalSearchParams();

    const collection = useAppStore((state) =>
        state.collections.find((c) => c.collectionId?.toString() === params.id)
  );

    const navigation = useNavigation();

    useLayoutEffect(() => {
      if (collection) {
        navigation.setOptions({
          title: collection.title,
        });
      }
    }, [collection]);

    const [loadingVerses, setLoadingVerses] = useState(true);

    const userVerses = [[]];
    // await getUserVersesPopulated

    if (loadingVerses) {
        return (
            <View style={{...styles.container, alignItems: 'center', justifyContent: 'center', marginTop: -100}}>
                <ActivityIndicator size={70} animating={true} />
            </View>
        )
    } else {
      return (
        <View style={styles.container}>
          {userVerses.map((userVerse) => (
            <UserVerseCard uvKey={userVerse.id} userVerse={userVerse} />
          ))}
        </View>
      );
    }
}