import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Collection, useAppStore } from '../store';
import getStyles from '../styles';
import useAppTheme from '../theme';

interface CollectionItemProps {
  collection: Collection;
  onMenuPress: (collection: Collection) => void;
}

export default function collectionItem({ collection, onMenuPress }: CollectionItemProps) {
  const styles = getStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  
  const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
  const ownerUsernameRaw = collection.username ?? collection.authorUsername;
  const authorUsernameRaw = collection.authorUsername;
  const isPublishedCopy = Boolean(
    authorUsernameRaw && collection.username && normalize(authorUsernameRaw) !== normalize(collection.username)
  );
  const isOwnedCollection = (() => {
    const owner = ownerUsernameRaw ? normalize(ownerUsernameRaw) : undefined;
    const author = authorUsernameRaw ? normalize(authorUsernameRaw) : undefined;
    const currentUser = normalize(user.username);

    if (!owner) {
      return author ? author === currentUser : currentUser.length > 0;
    }

    if (owner !== currentUser) {
      return false;
    }

    if (author && author !== owner) {
      return false;
    }

    return true;
  })();
  const visibilityLabel = isPublishedCopy && authorUsernameRaw
    ? `@${authorUsernameRaw}`
    : collection.visibility ?? '';

  const handlePress = () => {
    router.push(`../collections/${collection.collectionId}`);
  };
  
  return (
      <>
        <View
          key={collection.collectionId}
          style={[
            styles.collectionItem,
            {
              padding: 0,
              borderRadius: 10,
            }
          ]}
        >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePress}
              style={{ flex: 1 }}
            >
        <View style={{justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
          <View style={{justifyContent: 'space-between', height: '100%', flex: 1, marginRight: 10}}>
            <View style={{justifyContent: 'flex-start'}}>
              {/* title */}
              <View style={{}} key={collection.collectionId}>
                <Text 
                  numberOfLines={1} 
                  ellipsizeMode="tail"
                  style={{...styles.text, marginBottom: 0, fontWeight: 800, fontFamily: 'Inter'}}>
                  {collection.title}
                </Text>
              </View>
              <View>

                {/* number of verses */}
                <Text style={{...styles.tinyText, color: theme.colors.primary}}>{collection.userVerses.length} {collection.userVerses.length === 1 ? 'passage' : 'passages'}</Text>
              </View>
            </View>
            <View>

              {/* visibility or author */}
              <Text style={styles.tinyText}>{visibilityLabel}</Text>
            </View>
          </View>
          <View style={{justifyContent: 'space-between', height: '100%', alignItems: 'flex-start', flexDirection: 'row', gap: 8}}>
            
          {/* menu */}
            <View style={{ alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 5 }}>
              {collection.title === 'Favorites' ? 
              <Ionicons name='star' size={22} color={theme.colors.onBackground} style={{marginTop: 2, marginRight: 2}} />
              : 
                  <TouchableOpacity 
                    activeOpacity={0.1}
                      onPress={(e) => {
                        e.stopPropagation();
                        onMenuPress(collection);
                      }}>
                    <Ionicons name='ellipsis-vertical' size={22} color={theme.colors.onBackground} />
                  </TouchableOpacity>}
                  
              </View>
          </View>
          
            </View>
          </TouchableOpacity>
        </View>
    </>
  );
}