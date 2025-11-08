import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { PublishedCollection, getRecentPublishedCollections } from '../db';
import ExploreCollectionCard from '../components/exploreCollectionCard';

export default function RecentExploreList() {
  const styles = useStyles();
  const theme = useAppTheme();
  const [items, setItems] = useState<PublishedCollection[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getRecentPublishedCollections(200);
        setItems(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const renderItem = ({ item }: { item: PublishedCollection }) => (
    <View style={{ marginHorizontal: 8, marginVertical: 4 }}>
      <ExploreCollectionCard collection={item} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={{ ...styles.text, fontWeight: 700, marginHorizontal: 16, marginBottom: 8 }}>Latest Collections</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(c) => String(c.publishedId)}
      />
    </View>
  );
}


