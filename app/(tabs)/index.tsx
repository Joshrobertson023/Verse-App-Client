import { router } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { FAB } from 'react-native-paper';
import BoxedSection from '../components/boxedSection';
import Streak from '../components/streak';
import { useAppStore } from '../store';
import getStyles from '../styles';

export default function Index() {
  const styles = getStyles();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);

  return (
    <ScrollView
        style={styles.scrollContainer} // only styling ScrollView itself
        contentContainerStyle={{ 
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 50, 
          paddingHorizontal: 20, 
          paddingTop: 20,
          width: '100%'
        }}
      >
      <View style={{height: 'auto', width: '100%'}}>
        <Streak/>
        <View style={{height: 20}} />
        <BoxedSection title="42 Verses Memorized" />
        <BoxedSection title="7 Verses Overdue" alert={true} />
      </View>

      <Text style={styles.subheading}>My Verses</Text>
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
    </ScrollView>
  );
}