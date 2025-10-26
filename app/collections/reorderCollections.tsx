import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import colors from '../colors';
import { deleteCollection, updateCollectionsOrder, updateCollectionsSortBy } from '../db';
import { Collection, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

// Order collections by custom order
function orderCustom(array: Collection[], idString: string | undefined): Collection[] {
  if (!idString || array.length === 0) return array;

  const orderedIds = idString.split(',').map(id => id.trim()).filter(id => id.length > 0);
  const lookupMap = new Map<string, Collection>();
  for (const collection of array) {
    if (collection.collectionId) {
      lookupMap.set(String(collection.collectionId), collection);
    }
  }
  const reorderedArray: Collection[] = [];
  for (const id of orderedIds) {
    const col = lookupMap.get(id);
    if (col) {
      reorderedArray.push(col);
    }
  }
  const remainingCollections = array.filter(c => !reorderedArray.find(rc => rc.collectionId === c.collectionId));
  return [...reorderedArray, ...remainingCollections];
}

export default function ReorderCollections() {
  const styles = useStyles();
  const theme = useAppTheme();
  const collections = useAppStore((state) => state.collections);
  const user = useAppStore((state) => state.user);
  const setCollections = useAppStore((state) => state.setCollections);
  const setUser = useAppStore((state) => state.setUser);
  
  // Get non-favorite collections and sort by custom order
  const nonFavoriteCollections = collections.filter(c => !c.favorites && c.title !== 'Favorites');
  const sortedCollections = orderCustom(nonFavoriteCollections, user.collectionsOrder);
  
  const [reorderedData, setReorderedData] = useState<Collection[]>(sortedCollections);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Collection>) => {
      return (
        <TouchableOpacity
          style={[
            styles.collectionItem,
            { 
              backgroundColor: theme.colors.surface,
              opacity: isActive ? 0.8 : 1,
              elevation: isActive ? 8 : 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.3 : 0,
              shadowRadius: 4,
            },
          ]}
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={100}
        >
          <View style={{justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
            <View style={{justifyContent: 'space-between', height: '100%', flex: 1}}>
              <View style={{justifyContent: 'flex-start'}}>
                {/* title */}
                <Text style={{...styles.text, marginBottom: 0, fontWeight: 800}}>{item.title}</Text>
              </View>
              <View>
                {/* number of verses */}
                <Text style={styles.tinyText}>{item.userVerses.length} {item.userVerses.length === 1 ? 'passage' : 'passages'}</Text>
              </View>
            </View>
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <Ionicons name="reorder-three-outline" size={28} color={theme.colors.onBackground} />
            </View>
          </View>
        </TouchableOpacity>
      ); 
    }, [styles, theme]);

  const handleDragEnd = useCallback(({ data }: { data: Collection[] }) => {
    setReorderedData(data);
  }, []);

  const handleSave = async () => {
    // Combine favorites (always first) with reordered collections
    const favorites = collections.filter(c => c.favorites || c.title === 'Favorites');
    const allReordered = [...favorites, ...reorderedData];
    
    setCollections(allReordered);
    
    // Update user's collections order and set to custom sort
    const orderString = allReordered
      .filter(c => !c.favorites && c.title !== 'Favorites' && c.collectionId)
      .map(c => c.collectionId)
      .join(',');
    
    const updatedUser = { ...user, collectionsOrder: orderString, collectionsSortBy: 0 };
    setUser(updatedUser);
    
    // Update in database
    try {
      await updateCollectionsOrder(orderString, user.username);
      await updateCollectionsSortBy(0, user.username);
    } catch (error) {
      console.error('Failed to update collections order:', error);
    }
    
    // Navigate back
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={{backgroundColor: theme.colors.surface, padding: 15, borderRadius: 10, marginBottom: 15}}>
        <Text style={{...styles.tinyText, color: theme.colors.onSurface}}>
          Long press and drag to reorder your collections
        </Text>
        <Text style={{...styles.tinyText, color: theme.colors.onSurface, fontSize: 14, marginTop: 5}}>
          Your Favorites collection will always remain at the top
        </Text>
      </View>

      <DraggableFlatList
        data={reorderedData}
        renderItem={renderItem}
        keyExtractor={(collectionItem) => collectionItem.collectionId ? collectionItem.collectionId.toString() : '-1'}
        onDragEnd={handleDragEnd}
        contentContainerStyle={{paddingBottom: 100}}
      />

      {/* Shadow for Cancel button - positioned behind */}
      <View style={{
        position: 'absolute',
        bottom: 70,
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
        bottom: 70,
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
        bottom: 70,
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
          style={{
            flex: 1,
            marginLeft: 10,
            padding: 15,
            backgroundColor: theme.colors.primary,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{...styles.tinyText, fontWeight: '600', color: theme.colors.onPrimary}}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}