import React, { useCallback } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Text } from 'react-native-paper';
import { Collection, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

export default function Index() {
  const styles = useStyles();
  const theme = useAppTheme();
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const setUser = useAppStore((state) => state.setUser);

const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Collection>) => {
      return (
        <TouchableOpacity
          style={[
            styles.collectionItem,
            { backgroundColor: theme.colors.surface, opacity: isActive ? 0.8 : 1 },
          ]}
          onLongPress={drag}
          disabled={isActive}
        >
          <Text style={styles.text}>{item.title}</Text>
          <Text style={{}}>☰</Text>
        </TouchableOpacity>
      ); 
    }, [] );

  return (
    <View style={styles.container}>
        <DraggableFlatList
        data={collections}
        renderItem={renderItem}
        keyExtractor={(collectionItem) => collectionItem.collectionId ? collectionItem.collectionId.toString() : '-1'}
        onDragEnd={({data}) => {
            setCollections(data);
            const user = useAppStore.getState().user;
            user.collectionsOrder = data.map(c => c.collectionId).join(',');
            setUser(user);
            // Send to API to update in database
        }} />
    </View>
  )
}