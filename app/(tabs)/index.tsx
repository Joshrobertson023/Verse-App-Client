import { router } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Divider, FAB } from 'react-native-paper';
import BoxedSection from '../components/boxedSection';
import CollectionItem from '../components/collectionItem';
import Streak from '../components/streak';
import { useAppStore } from '../store';
import getStyles from '../styles';

export default function Index() {
  const styles = getStyles();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);


  return (
    <View style={{flex: 1}}>
    <ScrollView
        style={styles.scrollContainer}
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
        <Divider style={{ marginBottom: 10 }} />
        <BoxedSection title="42 Verses Memorized" />
        <BoxedSection title="7 Verses Overdue" alert={true} />
        <BoxedSection title="2 Published Collections" />
      </View>

      <Text style={{...styles.subheading, marginTop: 20}}>My Verses</Text>
    <View style={styles.collectionsContainer}>

      {collections.map((collection) => (
        <CollectionItem key={collection.id} collection={collection} />
      ))}

    </View>
    </ScrollView>
      <FAB
        icon="plus"
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          zIndex: 10,
        }}
        onPress={() => router.push('../collections/addnew')}
      />
      </View>
  );
}