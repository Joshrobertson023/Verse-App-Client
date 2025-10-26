import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import colors from '../colors';
import { useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

export default function ReorderVerses() {
  const styles = useStyles();
  const theme = useAppTheme();
  const newCollection = useAppStore((state) => state.newCollection);
  const setNewCollection = useAppStore((state) => state.setNewCollection);
  
  // Initialize with new collection data
  const [reorderedData, setReorderedData] = useState<UserVerse[]>(newCollection?.userVerses || []);
  const [isSaving, setIsSaving] = useState(false);

  // Update reorderedData if newCollection changes
  useEffect(() => {
    if (newCollection?.userVerses && newCollection.userVerses.length > 0) {
      console.log('Updating reorderedData with newCollection:', newCollection.userVerses.length, 'verses');
      setReorderedData(newCollection.userVerses);
    }
  }, [newCollection?.userVerses]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<UserVerse>) => {
      return (
        <TouchableOpacity
          style={[
            {
              width: '100%',
              marginBottom: 20,
              minWidth: '100%',
            },
            {
              backgroundColor: theme.colors.surface,
              opacity: isActive ? 0.8 : 1,
              elevation: isActive ? 8 : 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.3 : 0,
              shadowRadius: 4,
              padding: 20,
              borderRadius: 3,
            },
          ]}
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={100}
        >
          <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%'}}>
            <View style={{flex: 1}}>
              <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{item.readableReference}</Text>
              {item.verses.map((verse) => (
                <View key={verse.verse_reference} style={{}}>
                  <View>
                    <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{verse.verse_Number ? verse.verse_Number + ": " : ''}{verse.text}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <Ionicons name="reorder-three-outline" size={28} color={theme.colors.onBackground} />
            </View>
          </View>
        </TouchableOpacity>
      ); 
    }, [styles, theme]);

  const handleDragEnd = useCallback(({ data }: { data: UserVerse[] }) => {
    console.log('handleDragEnd - updating reorderedData with', data.length, 'verses');
    setReorderedData(data);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Create verseOrder string from reordered data
    let verseOrder = '';
    reorderedData.forEach((userVerse: UserVerse) => {
      verseOrder += userVerse.readableReference + ',';
    });
    
    console.log('Saving new collection reorder - verseOrder:', verseOrder);
    console.log('Saving new collection reorder - verses:', reorderedData.map(uv => uv.readableReference));
    
    // Update local state (will be saved when collection is created)
    setNewCollection({
      ...newCollection, 
      userVerses: reorderedData,
      verseOrder: verseOrder
    });
    
    setIsSaving(false);
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={{backgroundColor: theme.colors.surface, padding: 15, borderRadius: 10, marginBottom: 15}}>
        <Text style={{...styles.tinyText, color: theme.colors.onSurface}}>
          Long press and drag to reorder your passages
        </Text>
      </View>

      <DraggableFlatList
        data={reorderedData}
        renderItem={renderItem}
        keyExtractor={(item) => item.readableReference || item.verses[0]?.verse_reference || 'unknown'}
        onDragEnd={handleDragEnd}
        contentContainerStyle={{paddingBottom: 100}}
      />

      {/* Shadow for Cancel button - positioned behind */}
      <View style={{
        position: 'absolute',
        bottom: 60,
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
        bottom: 60,
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
        bottom: 60,
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
          disabled={isSaving}
          style={{
            flex: 1,
            marginLeft: 10,
            padding: 15,
            backgroundColor: isSaving ? theme.colors.surface : theme.colors.primary,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{...styles.tinyText, fontWeight: '600', color: isSaving ? theme.colors.onSurface : theme.colors.onPrimary}}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

