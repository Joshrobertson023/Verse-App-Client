import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getCollectionById } from '../../../db';
import { Collection } from '../../../store';
import useStyles from '../../../styles';
import useAppTheme from '../../../theme';

export default function FriendCollectionScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const { username, id } = useLocalSearchParams<{ username: string; id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    try {
      setLoading(true);
      const col = { collectionId: parseInt(id), authorUsername: username };
      const data = await getCollectionById(col.collectionId);
      setCollection(data);
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.onBackground, fontSize: 16 }}>Collection not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: collection.title,
          headerBackVisible: true,
        }}
      />
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ padding: 20 }}>
          {/* Collection Info */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20
          }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: theme.colors.onBackground,
              marginBottom: 8,
              fontFamily: 'Inter'
            }}>
              {collection.title}
            </Text>
            <Text style={{
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter',
              marginBottom: 4
            }}>
              {collection.numVerses} verses • {collection.visibility}
            </Text>
          </View>

          {/* Verses */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Verses
            </Text>

            {collection.userVerses.length === 0 ? (
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                padding: 20,
                alignItems: 'center'
              }}>
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  No verses in this collection
                </Text>
              </View>
            ) : (
              collection.userVerses.map((verse, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 10
                  }}
                  onPress={() => {
                    // Navigate to Bible tab to read the verse
                    router.push({
                      pathname: '/(tabs)/bible',
                      params: {
                        book: verse.readableReference.split(' ')[0],
                        chapter: verse.readableReference.split(':')[1]
                      }
                    });
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    color: theme.colors.primary,
                    fontWeight: '600',
                    marginBottom: 8,
                    fontFamily: 'Inter'
                  }}>
                    {verse.readableReference}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: theme.colors.onBackground,
                    fontFamily: 'Inter',
                    lineHeight: 20
                  }}>
                    {verse.verses && verse.verses.length > 0 ? verse.verses[0].text : 'Loading verse text...'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

