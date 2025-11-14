import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Collection } from '../store';
import getStyles from '../styles';
import useAppTheme from '../theme';

interface FriendCollectionItemProps {
  collection: Collection;
  authorUsername: string;
}

export default function FriendCollectionItem({ collection, authorUsername }: FriendCollectionItemProps) {
  const styles = getStyles();
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      key={collection.collectionId}
      onPress={() => router.push(`/user/${authorUsername}/collection/${collection.collectionId}`)}>
      <View style={styles.collectionItem}>
        <View style={{justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
          <View style={{justifyContent: 'space-between', height: '100%', flex: 1, marginRight: 10}}>
            <View style={{justifyContent: 'flex-start'}}>
              {/* title */}
              <View style={{}} key={collection.collectionId}>
                <Text 
                  numberOfLines={1} 
                  ellipsizeMode="tail"
                  style={{...styles.text, marginBottom: 0, fontWeight: 800}}>
                  {collection.title}
                </Text>
              </View>
              <View>
                {/* number of verses */}
                <Text style={styles.tinyText}>{collection.numVerses || collection.userVerses?.length || 0} {collection.numVerses === 1 ? 'passage' : 'passages'}</Text>
              </View>
            </View>
            <View>
              {/* visibility */}
              <Text style={styles.tinyText}>
                {collection.visibility === 'Public' ? 'Visible to Friends' : collection.visibility === 'Private' ? 'Not Visible to Friends' : collection.visibility}
              </Text>
            </View>
          </View>
          <View style={{justifyContent: 'space-between', height: '100%', alignItems: 'flex-end'}}>
            <View style={{justifyContent: 'center', alignItems: 'flex-end'}}>
              <Ionicons name='chevron-forward' size={24} color={theme.colors.onSurfaceVariant} />
            </View>
            <View>
              {/* author */}
              <Text style={styles.tinyText}>{authorUsername}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}



