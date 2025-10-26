import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import colors from '../colors';
import { updateCollectionDB, deleteUserVersesFromCollection, addUserVersesToNewCollection, getUserCollections } from '../db';
import { useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

export default function ReorderExistingVerses() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const setCollections = useAppStore((state) => state.setCollections);
  const updateCollection = useAppStore((state) => state.updateCollection);
  const editingCollection = useAppStore((state) => state.editingCollection);
  const setEditingCollection = useAppStore((state) => state.setEditingCollection);
  
  const [reorderedData, setReorderedData] = useState<UserVerse[]>(editingCollection?.userVerses || []);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize reorderedData when editingCollection changes
  useEffect(() => {
    if (editingCollection?.userVerses) {
      console.log('Initializing reorderedData with:', editingCollection.userVerses.length, 'verses for existing collection');
      setReorderedData(editingCollection.userVerses);
    }
  }, [editingCollection?.userVerses]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<UserVerse>) => {
      return (
        <TouchableOpacity
          style={[
            {
              width: '100%',
              marginBottom: 20,
              minWidth: '100%',
            },
            {
              backgroundColor: theme.colors.surface,
              opacity: isActive ? 0.8 : 1,
              elevation: isActive ? 8 : 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.3 : 0,
              shadowRadius: 4,
              padding: 20,
              borderRadius: 3,
            },
          ]}
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={100}
        >
          <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%'}}>
            <View style={{flex: 1}}>
              <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{item.readableReference}</Text>
              {item.verses.map((verse) => (
                <View key={verse.verse_reference} style={{}}>
                  <View>
                    <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{verse.verse_Number ? verse.verse_Number + ": " : ''}{verse.text}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <Ionicons name="reorder-three-outline" size={28} color={theme.colors.onBackground} />
            </View>
          </View>
        </TouchableOpacity>
      ); 
    }, [styles, theme]);

  const handleDragEnd = useCallback(({ data }: { data: UserVerse[] }) => {
    console.log('handleDragEnd - updating reorderedData with', data.length, 'verses for existing collection');
    setReorderedData(data);
  }, []);

  const handleSave = async () => {
    if (!editingCollection?.collectionId) {
      console.error('No collection ID to update');
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    
    console.log('Saving existing collection - reorderedData length:', reorderedData.length);
    
    // Create verseOrder string from reordered data
    let verseOrder = '';
    reorderedData.forEach((userVerse: UserVerse) => {
      verseOrder += userVerse.readableReference + ',';
    });
    console.log('Saving existing collection - verseOrder:', verseOrder);
    console.log('Saving existing collection - reorderedData verses:', reorderedData.map(uv => uv.readableReference));
    
    try {
      // Update collection in database (includes verseOrder update)
      const updatedCollection = {
        ...editingCollection,
        userVerses: reorderedData,
        verseOrder: verseOrder
      };
      
      console.log('Updating existing collection with verseOrder:', verseOrder);
      await updateCollectionDB(updatedCollection);
      
      // Delete old user verses
      await deleteUserVersesFromCollection(editingCollection.collectionId);
      
      // Add updated user verses
      await addUserVersesToNewCollection(reorderedData, editingCollection.collectionId);
      
      // Fetch updated collections from server
      const collections = await getUserCollections(user.username);
      setCollections(collections);
      
      // Find the updated collection with server-ordered verses
      const updatedCol = collections.find(c => c.collectionId === editingCollection.collectionId);
      console.log('Fetched collection verseOrder:', updatedCol?.verseOrder);
      console.log('Fetched collection userVerses:', updatedCol?.userVerses.map(uv => uv.readableReference));
      
      if (updatedCol) {
        // Update store with server-ordered collection
        updateCollection(updatedCol);
        setEditingCollection(updatedCol);
        
        // Force trigger a re-render by updating isSaving state
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setIsSaving(false);
      router.back();
    } catch (error) {
      console.error('Failed to save existing collection:', error);
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={{backgroundColor: theme.colors.surface, padding: 15, borderRadius: 10, marginBottom: 15}}>
        <Text style={{...styles.tinyText, color: theme.colors.onSurface}}>
          Long press and drag to reorder your passages
        </Text>
      </View>

      <DraggableFlatList
        data={reorderedData}
        renderItem={renderItem}
        keyExtractor={(item) => item.readableReference || item.verses[0]?.verse_reference || 'unknown'}
        onDragEnd={handleDragEnd}
        contentContainerStyle={{paddingBottom: 100}}
      />

      {/* Shadow for Cancel button - positioned behind */}
      <View style={{
        position: 'absolute',
        bottom: 60,
        left: 20,
        width: '47%',
        height: 56,
        backgroundColor: 'transparent',
        borderRadius: 10,
        boxShadow: '0px 0px 43px 20px rgba(0,0,0,.5)',
        zIndex: 5,
      }}></View>

      {/* Shadow for Save button - positioned behind */}
      <View style={{
        position: 'absolute',
        bottom: 60,
        right: 20,
        width: '47%',
        height: 56,
        backgroundColor: 'transparent',
        borderRadius: 10,
        boxShadow: '0px 0px 43px 20px rgba(0,0,0,.5)',
        zIndex: 5,
      }}></View>

      <View style={{
        flexDirection: 'row',
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        zIndex: 10,
      }}>
        <TouchableOpacity 
          onPress={handleCancel}
          style={{
            flex: 1,
            marginRight: 10,
            padding: 15,
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{...styles.tinyText, fontWeight: '600', color: colors.error}}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleSave}
          disabled={isSaving}
          style={{
            flex: 1,
            marginLeft: 10,
            padding: 15,
            backgroundColor: isSaving ? theme.colors.surface : theme.colors.primary,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{...styles.tinyText, fontWeight: '600', color: isSaving ? theme.colors.onSurface : theme.colors.onPrimary}}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
