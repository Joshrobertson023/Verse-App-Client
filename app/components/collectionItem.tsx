import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Menu } from 'react-native-paper';
import { Collection } from '../store'; // Adjust the import path for your Collection type
import getStyles from '../styles';
import useAppTheme from '../theme';

interface CollectionItemProps {
  collection: Collection;
}

export default function collectionItem({ collection }: CollectionItemProps) {
  const styles = getStyles();
  const theme = useAppTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <TouchableOpacity
      key={collection.id}
      onPress={() => router.push(`../collections/${collection.id}`)}
    >
      <View style={styles.collectionItem}>
        <View style={{justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
          <View style={{justifyContent: 'space-between', height: '100%'}}>
            <View style={{justifyContent: 'flex-start'}}>

              {/* title */}
              {collection.favorites ? 
              <View style={{}}>
                <Text style={{...styles.text, marginBottom: 0, fontWeight: 900}} key={collection.id}>{collection.title}</Text>
                <Ionicons name="star" size={25} color={theme.colors.onBackground} />
              </View> 
              : 
              <View>
                <Text style={{...styles.text, marginBottom: 0, fontWeight: 900}} key={collection.id}>{collection.title}</Text>
              </View>}
              <View>

                {/* number of verses */}
                <Text style={styles.tinyText}>{collection.userVerses.length} verses</Text>
              </View>
            </View>
            <View>

              {/* visibility */}
              <Text style={styles.tinyText}>{collection.visibility}</Text>
            </View>
          </View>
          <View style={{justifyContent: 'space-between', height: '100%', alignItems: 'flex-end'}}>

          {/* menu */}
            {collection.favorites ? 
            <View>
              <Menu
                visible={menuVisible}
                onDismiss={closeMenu}
                anchor={
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      openMenu();
                    }}>
                    <Ionicons name='ellipsis-vertical' size={30} color={theme.colors.onBackground} />
                  </TouchableOpacity>
                }>
                  <Menu.Item onPress={() => {  }} title="Create Copy" />
                  <Menu.Item onPress={() => {  }} title="Clear" />
                </Menu>
              </View>
            : 
            <View>
              <Menu
                visible={menuVisible}
                onDismiss={closeMenu}
                anchor={
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      openMenu();
                    }}>
                    <Ionicons name='ellipsis-vertical' size={30} color={theme.colors.onBackground} />
                  </TouchableOpacity>
                }>
                  <Menu.Item onPress={() => {  }} title="Edit" />
                  <Menu.Item onPress={() => {  }} title="Create Copy" />
                  <Menu.Item onPress={() => {  }} title={collection.visibility === 'Public' ? "Make Private" : "Make Public"} />
                  <Menu.Item onPress={() => {  }} title="Publish" />
                  <Menu.Item onPress={() => {  }} title="Delete" />
                </Menu>
              </View>}
            <View>

              {/* author */}
              <Text style={styles.tinyText}>{collection.author ? collection.author : ''}</Text>
            </View>
          </View>
          
        </View>
      </View>
    </TouchableOpacity>
  );
}