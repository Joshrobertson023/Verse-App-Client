import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import colors from '../colors';
import { updateCollectionsOrder, updateCollectionsSortBy } from '../db';
import { Collection, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

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
  
  const nonFavoriteCollections = collections.filter(c => !c.favorites && c.title !== 'Favorites');
  const sortedCollections = orderCustom(nonFavoriteCollections, user.collectionsOrder);
  
  const [reorderedData, setReorderedData] = useState<Collection[]>(sortedCollections);
  const [saveButtonEnabled, setSaveButtonEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Collection>) => {
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
              padding: 20,
              marginBottom: -8
            },
          ]}
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={100}
        >
          <View style={{justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
            <View style={{justifyContent: 'space-between', height: '100%', flex: 1}}>
              <View style={{justifyContent: 'flex-start'}}>
                <Text style={{...styles.text, marginBottom: 0, fontWeight: 800}}>{item.title}</Text>
              </View>
              <View>
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
    setSaveButtonEnabled(true);
    setReorderedData(data);
  }, []);

  const handleSave = async () => {
    setSaveButtonEnabled(false);
    setIsSaving(true);
    const favorites = collections.filter(c => c.favorites || c.title === 'Favorites');
    const allReordered = [...favorites, ...reorderedData];
    
    setCollections(allReordered);
    const orderString = allReordered
      .filter(c => !c.favorites && c.title !== 'Favorites' && c.collectionId)
      .map(c => c.collectionId)
      .join(',');
    
    const updatedUser = { ...user, collectionsOrder: orderString, collectionsSortBy: 0 };
    setUser(updatedUser);
    
    try {
      await updateCollectionsOrder(orderString, user.username);
      await updateCollectionsSortBy(0, user.username);
    } catch (error) {
      console.error('Failed to update collections order:', error);
    } finally {
      setIsSaving(false);
    }

    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>

      <DraggableFlatList
        data={reorderedData}
        renderItem={renderItem}
        keyExtractor={(collectionItem) => collectionItem.collectionId ? collectionItem.collectionId.toString() : '-1'}
        onDragEnd={handleDragEnd}
        contentContainerStyle={{paddingBottom: 200}}
        onDragBegin={() => setSaveButtonEnabled(false)}
      />

      <View style={{
        position: 'absolute',
        bottom: 50,
        left: 20,
        width: '47%',
        height: 52,
        backgroundColor: 'transparent',
        borderRadius: 10,
        boxShadow: '0px 0px 43px 20px rgba(0,0,0,.2)',
        zIndex: 5,
      }}></View>

      <View style={{
        position: 'absolute',
        bottom: 50,
        right: 20,
        width: '47%',
        height: 52,
        backgroundColor: 'transparent',
        borderRadius: 10,
        boxShadow: '0px 0px 43px 20px rgba(0,0,0,.2)',
        zIndex: 5,
      }}></View>

      <View style={{
        flexDirection: 'row',
        position: 'absolute',
        bottom: 50,
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
        {saveButtonEnabled === true ? (
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
              }}>
              <Text style={{...styles.tinyText, fontWeight: '600', color: isSaving ? theme.colors.onSurface : theme.colors.onPrimary}}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          ) : (
          <View style={{
              flex: 1,
              marginLeft: 10,
              padding: 15,
              backgroundColor: theme.colors.surface,
              borderRadius: 10,
              alignItems: 'center',
          }}>
            <Text style={{...styles.tinyText, fontWeight: '600', color: theme.colors.surface2}}>Save</Text>
          </View>
        )}
      </View>
    </View>
  )
}