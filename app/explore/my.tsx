import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { PublishedCollection, getPublishedCollectionsByAuthor } from '../db';
import { useAppStore } from '../store';
import ExploreCollectionCard from '../components/exploreCollectionCard';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function MyCollectionsPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const [collections, setCollections] = useState<PublishedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sortCollectionsBySaves = useCallback((cols: PublishedCollection[]) => {
    return [...cols].sort((a, b) => {
      const savesA = typeof a.numSaves === 'number' ? a.numSaves : 0;
      const savesB = typeof b.numSaves === 'number' ? b.numSaves : 0;
      return savesB - savesA;
    });
  }, []);

  const loadCollections = useCallback(async (isRefresh = false) => {
    if (!user?.username || user.username === 'Default User') {
      setCollections([]);
      if (!isRefresh) setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getPublishedCollectionsByAuthor(user.username);
      setCollections(sortCollectionsBySaves(data));
    } catch (error) {
      console.error('Failed to load my collections:', error);
      setCollections([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [user?.username, sortCollectionsBySaves]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleCollectionSaved = async (_id: number) => {
    try {
      await loadCollections(true);
    } catch (e) {
      // ignore refresh failure
    }
  };

  const renderItem = ({ item }: { item: PublishedCollection }) => (
    <View style={{ marginHorizontal: 16, marginVertical: 8 }}>
      <ExploreCollectionCard collection={item} onSaved={handleCollectionSaved} fullWidth={true} />
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Collections',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.onBackground,
          headerTitleStyle: { color: theme.colors.onBackground },
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : collections.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
            <Text style={{ ...styles.text, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              You have no published collections yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={collections}
            renderItem={renderItem}
            keyExtractor={(c) => String(c.publishedId)}
            contentContainerStyle={{ paddingVertical: 8 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadCollections(true)}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}
      </View>
    </>
  );
}





