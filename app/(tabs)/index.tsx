import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Divider, FAB } from 'react-native-paper';
import CollectionItem from '../components/collectionItem';
import { useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function Index() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);
  const homePageStats = useAppStore((state) => state.homePageStats);
  const setCollections = useAppStore((state) => state.setCollections);

  useEffect(() => { // Apparently this runs even if the user is not logged in
    if (useAppStore.getState().user.username === 'Default User') {
      return;
    }
  }, []);


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

        {/* Boxed Sections */}
      <View style={{height: 'auto', width: '100%'}}>
            <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center'}}>
                <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Ionicons name="flame" size={32} color={theme.colors.onBackground} style={{marginRight: 5}} />
                    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={{...styles.tinyText, fontSize: 22, fontWeight: 900, marginBottom: -3, marginTop: -3}}>{user.streakLength}</Text>
                      </View>
                      <Text style={{...styles.tinyText, fontSize: 14}}>Day Streak</Text>
                    </View>
                    <Ionicons name='chevron-forward' size={20} color={'gray'} />
                </View>
            </TouchableOpacity>
            <Divider style={{ marginBottom: 10, marginTop: 10 }} />
            
            <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center'}}>
                <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Ionicons name="checkmark-done" size={28} color={theme.colors.onBackground} style={{marginRight: 8}} />
                    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={{...styles.tinyText, fontSize: 22, fontWeight: 900, marginBottom: -3, marginTop: -3}}>{user.versesMemorized}</Text>
                      </View>
                      <Text style={{...styles.tinyText, fontSize: 14}}>Verses Memorized</Text>
                    </View>
                    <Ionicons name='chevron-forward' size={20} color={'gray'} />
                </View>
            </TouchableOpacity>
            <Divider style={{ marginBottom: 10, marginTop: 10 }} />
            
            <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center'}}>
                <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Ionicons name="extension-puzzle" size={28} color={theme.colors.onBackground} style={{marginRight: 8}} />
                    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {user.versesOverdue > 0 ? <Ionicons name='alert-circle' size={22} color={'gray'} /> : null}
                        <Text style={{...styles.tinyText, fontSize: 22, fontWeight: 900, marginBottom: -3, marginTop: -3}}>{user.versesOverdue}</Text>
                      </View>
                      <Text style={{...styles.tinyText, fontSize: 14}}>Verses Overdue</Text>
                    </View>
                    <Ionicons name='chevron-forward' size={20} color={'gray'} />
                </View>
            </TouchableOpacity>
            <Divider style={{ marginBottom: 10, marginTop: 10 }} />
            
            <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center'}}>
                <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Ionicons name="people" size={28} color={theme.colors.onBackground} style={{marginRight: 8}} />
                    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={{...styles.tinyText, fontSize: 22, fontWeight: 900, marginBottom: -3, marginTop: -3}}>{user.numberPublishedCollections}</Text>
                      </View>
                      <Text style={{...styles.tinyText, fontSize: 14}}>Published Collections</Text>
                    </View>
                    <Ionicons name='chevron-forward' size={20} color={'gray'} />
                </View>
            </TouchableOpacity>
            <Divider style={{ marginBottom: 10, marginTop: 10 }} />
      </View>


      <Text style={{...styles.subheading, marginTop: 20}}>My Verses</Text>
    <View style={styles.collectionsContainer}>

      {collections.map((collection) => (
        <CollectionItem key={collection.collectionId} collection={collection} />
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
          backgroundColor: theme.colors.secondary,
        }}
        onPress={() => router.push('../collections/addnew')}
      />
      </View>
  );
}