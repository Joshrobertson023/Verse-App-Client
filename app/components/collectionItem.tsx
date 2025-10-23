import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Collection } from '../store'; // Adjust the import path for your Collection type
import getStyles from '../styles';
import useAppTheme from '../theme';

interface CollectionItemProps {
  collection: Collection;
  onMenuPress: (collection: Collection) => void;
}

export default function collectionItem({ collection, onMenuPress }: CollectionItemProps) {
  const styles = getStyles();
  const theme = useAppTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <TouchableOpacity
        key={collection.collectionId}
        onPress={() => router.push(`../collections/${collection.collectionId}`)}>
      <View style={styles.collectionItem}>
        <View style={{justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
          <View style={{justifyContent: 'space-between', height: '100%'}}>
            <View style={{justifyContent: 'flex-start'}}>
              {/* title */}
              <View style={{}} key={collection.collectionId}>
                <Text style={{...styles.text, marginBottom: 0, fontWeight: 800}}>{collection.title}</Text>
              </View>
              <View>

                {/* number of verses */}
                <Text style={styles.tinyText}>{collection.userVerses.length} {collection.userVerses.length === 1 ? 'passage' : 'passages'}</Text>
              </View>
            </View>
            <View>

              {/* visibility */}
              <Text style={styles.tinyText}>{collection.visibility}</Text>
            </View>
          </View>
          <View style={{justifyContent: 'space-between', height: '100%', alignItems: 'flex-end'}}>

          {/* menu */}
            <View>
              {collection.title === 'Favorites' ? 
              <Ionicons name='star' size={22} color={theme.colors.onBackground} style={{marginTop: 2, marginRight: 2}} />
              : 
                  <TouchableOpacity 
                    onPress={() => onMenuPress(collection)}>
                    <Ionicons name='ellipsis-vertical' size={30} color={theme.colors.onBackground} />
                  </TouchableOpacity>}
                  
              </View>
            <View>

              {/* author */}
              {collection.title === 'Favorites' ? null : <Text style={styles.tinyText}>{collection.authorUsername ? collection.authorUsername : ''}</Text>}
              
            </View>
          </View>
          
        </View>
      </View>
    </TouchableOpacity>
  );
}