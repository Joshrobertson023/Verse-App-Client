import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import { getUserVersesPopulated } from '../db';
import { useAppStore, UserVerse } from '../store';
import useStyles from '../styles';

export default function Index() {
  const styles = useStyles();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);
  const params = useLocalSearchParams();

    const navigation = useNavigation();

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    const [loadingVerses, setLoadingVerses] = useState(false);
    const [userVerses, setUserVerses] = useState<UserVerse[]>([]);
    
    const collection = useAppStore((state) =>
      state.collections.find((c) => c.collectionId?.toString() === params.id)
  );

useEffect(() => {
  console.log('Collection ID being sought:', id);
  console.log('Is Collection found?', !!collection);
  if (!collection) return;
  
  console.log('Running fetchPopulated for collection:', collection.title);
  
  const fetchPopulated = async () => {
    setLoadingVerses(true);
    try {
      const colToSend = { ...collection, UserVerses: collection.userVerses ?? [] };
      const data = await getUserVersesPopulated(colToSend);
      setUserVerses(data.userVerses ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVerses(false);
    }
  };
  
  fetchPopulated();
}, [collection]);

useLayoutEffect(() => {
  if (collection) {
    navigation.setOptions({
      title: collection.title,
    });
  }
}, [collection]);

    if (loadingVerses) {
        return (
            <View style={{...styles.container, alignItems: 'center', justifyContent: 'center', marginTop: -100}}>
                <ActivityIndicator size={70} animating={true} />
            </View>
        )
    } else {
      return (
        <View style={styles.container}>
          {userVerses.map((userVerse: UserVerse) => (

              <View key={userVerse.id} style={{width: '100%', marginBottom: 20}}>
                  <Surface style={{width: '100%', padding: 20, borderRadius: 3}} elevation={4}>
                      <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{userVerse.readableReference}</Text>
                      {userVerse.verses.map((verse) => (
                          <View key={verse.verse_reference} style={{}}>
                              <View>
                                  <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{verse.verse_Number}: {verse.text} </Text>
                              </View>
                          </View>
                      ))}
                  </Surface>
              </View>

          ))}
        </View>
      );
    }
}