import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import colors from '../colors';
import { useAppStore, UserVerse, CollectionNote } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

type ReorderableItem = {type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote};

export default function ReorderVerses() {
  const styles = useStyles();
  const theme = useAppTheme();
  const newCollection = useAppStore((state) => state.newCollection);
  const setNewCollection = useAppStore((state) => state.setNewCollection);
  
  // Initialize with combined verses and notes
  const [reorderedData, setReorderedData] = useState<ReorderableItem[]>([]);
  const [saveButtonEnabled, setSaveButtonEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Build initial reordered data from collection
  useEffect(() => {
    if (!newCollection) return;
    
    const verses = newCollection.userVerses || [];
    const notes = newCollection.notes || [];
    
    // Combine verses and notes, order by verseOrder
    const orderArray = newCollection.verseOrder?.split(',').filter(o => o.trim()) || [];
    const verseMap = new Map(verses.map((uv: UserVerse) => [uv.readableReference, uv]));
    const noteMap = new Map(notes.map(n => [n.id, n]));
    const ordered: ReorderableItem[] = [];
    const unordered: ReorderableItem[] = [];
    
    orderArray.forEach(ref => {
      const trimmedRef = ref.trim();
      if (verseMap.has(trimmedRef)) {
        ordered.push({type: 'verse', data: verseMap.get(trimmedRef)!});
        verseMap.delete(trimmedRef);
      } else if (noteMap.has(trimmedRef)) {
        ordered.push({type: 'note', data: noteMap.get(trimmedRef)!});
        noteMap.delete(trimmedRef);
      }
    });
    
    verseMap.forEach(verse => unordered.push({type: 'verse', data: verse}));
    noteMap.forEach(note => unordered.push({type: 'note', data: note}));
    
    setReorderedData([...ordered, ...unordered]);
  }, [newCollection?.userVerses, newCollection?.notes, newCollection?.verseOrder]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ReorderableItem>) => {
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
              {item.type === 'verse' ? (
                <>
                  <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{item.data.readableReference}</Text>
                  {item.data.verses.map((verse) => (
                    <View key={verse.verse_reference} style={{}}>
                      <View>
                        <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{verse.verse_Number ? verse.verse_Number + ": " : ''}{verse.text}</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                    <Ionicons name="document-text-outline" size={18} color={theme.colors.onBackground} style={{marginRight: 8}} />
                    <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>Note</Text>
                  </View>
                  <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{item.data.text}</Text>
                </>
              )}
            </View>
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <Ionicons name="reorder-three-outline" size={28} color={theme.colors.onBackground} />
            </View>
          </View>
        </TouchableOpacity>
      ); 
    }, [styles, theme]);

  const handleDragEnd = useCallback(({ data }: { data: ReorderableItem[] }) => {
    console.log('handleDragEnd - updating reorderedData with', data.length, 'items');
    setSaveButtonEnabled(true);
    setReorderedData(data);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // Separate verses and notes from reordered data
    const reorderedVerses: UserVerse[] = [];
    const reorderedNotes: CollectionNote[] = [];
    
    reorderedData.forEach((item) => {
      if (item.type === 'verse') {
        reorderedVerses.push(item.data);
      } else {
        reorderedNotes.push(item.data);
      }
    });
    
    // Create verseOrder string from reordered data (combines verse refs and note IDs)
    const verseRefs = reorderedVerses
      .map((uv) => uv.readableReference?.trim())
      .filter((ref): ref is string => Boolean(ref && ref.length > 0));
    const noteIds = reorderedNotes.map((n) => n.id);
    const verseOrder = [...verseRefs, ...noteIds].join(',');
    
    console.log('Saving new collection reorder - verseOrder:', verseOrder);
    console.log('Saving new collection reorder - verses:', reorderedVerses.map(uv => uv.readableReference));
    console.log('Saving new collection reorder - notes:', reorderedNotes.map(n => n.id));
    
    // Update local state (will be saved when collection is created)
    setNewCollection({
      ...newCollection, 
      userVerses: reorderedVerses,
      notes: reorderedNotes,
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
          Long press and drag to reorder your passages and notes
        </Text>
      </View>

      <DraggableFlatList
        data={reorderedData}
        renderItem={renderItem}
        keyExtractor={(item) => item.type === 'verse' 
          ? item.data.readableReference || item.data.verses[0]?.verse_reference || 'unknown'
          : item.data.id}
        onDragEnd={handleDragEnd}
        contentContainerStyle={{paddingBottom: 200}}
        onDragBegin={() => setSaveButtonEnabled(false)}
      />

      <View style={{
        position: 'absolute',
        bottom: 70,
        left: 20,
        width: '47%',
        height: 52,
        backgroundColor: 'transparent',
        borderRadius: 10,
        boxShadow: '0px 0px 43px 20px rgba(0,0,0,.5)',
        zIndex: 5,
      }}></View>

      <View style={{
        position: 'absolute',
        bottom: 70,
        right: 20,
        width: '47%',
        height: 52,
        backgroundColor: 'transparent',
        borderRadius: 10,
        boxShadow: '0px 0px 43px 20px rgba(0,0,0,.5)',
        zIndex: 5,
      }}></View>

      <View style={{
        flexDirection: 'row',
        position: 'absolute',
        bottom: 70,
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

