import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import colors from '../colors';
import { addUserVersesToNewCollection, deleteUserVersesFromCollection, getUserCollections, updateCollectionDB } from '../db';
import { Collection, CollectionNote, useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const { height } = Dimensions.get('window');

type ReorderableItem = {type: 'verse', data: UserVerse} | {type: 'note', data: CollectionNote};

// Order verses by verseOrder
function orderByVerseOrder(userVerses: UserVerse[], verseOrder?: string): UserVerse[] {
  if (!verseOrder || !verseOrder.trim()) return userVerses;
  
  const orderArray = verseOrder.split(',').filter(ref => ref.trim() !== '').map(ref => ref.trim());
  const ordered: UserVerse[] = [];
  const unordered: UserVerse[] = [];
  
  // Create a map for quick lookup (case-insensitive)
  const verseMap = new Map<string, UserVerse>();
  userVerses.forEach(uv => {
    if (uv.readableReference) {
      const key = uv.readableReference.trim().toLowerCase();
      if (!verseMap.has(key)) {
        verseMap.set(key, uv);
      }
    }
  });
  
  // First, add verses in the order specified
  orderArray.forEach(ref => {
    const key = ref.toLowerCase();
    const verse = verseMap.get(key);
    if (verse) {
      ordered.push(verse);
      verseMap.delete(key);
    }
  });
  
  // Then add any verses not in the order
  verseMap.forEach(verse => {
    unordered.push(verse);
  });
  
  return [...ordered, ...unordered];
}

export default function ReorderExistingVerses() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const setCollections = useAppStore((state) => state.setCollections);
  const updateCollection = useAppStore((state) => state.updateCollection);
  const editingCollection = useAppStore((state) => state.editingCollection);
  const setEditingCollection = useAppStore((state) => state.setEditingCollection);
  const collections = useAppStore((state) => state.collections);
  const params = useLocalSearchParams();
  
  const collectionId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : undefined;
  
  // Get collection from store or editingCollection
  const collection = collectionId 
    ? collections.find(c => c.collectionId?.toString() === collectionId)
    : editingCollection;
  
  const [reorderedData, setReorderedData] = useState<ReorderableItem[]>([]);
  const [saveButtonEnabled, setSaveButtonEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize reorderedData when collection changes
  useEffect(() => {
    if (!collection) {
      setIsLoading(false);
      return;
    }
    
    const verses = collection.userVerses || [];
    const notes = collection.notes || [];
    
    // Combine verses and notes, order by verseOrder
    const orderArray = collection.verseOrder?.split(',').filter(o => o.trim()) || [];
    const verseMap = new Map(verses.map((uv: UserVerse) => [uv.readableReference?.trim().toLowerCase(), uv]));
    const noteMap = new Map(notes.map(n => [n.id, n]));
    const ordered: ReorderableItem[] = [];
    const unordered: ReorderableItem[] = [];
    
    orderArray.forEach(ref => {
      const trimmedRef = ref.trim();
      const verseKey = trimmedRef.toLowerCase();
      if (verseMap.has(verseKey)) {
        ordered.push({type: 'verse', data: verseMap.get(verseKey)!});
        verseMap.delete(verseKey);
      } else if (noteMap.has(trimmedRef)) {
        ordered.push({type: 'note', data: noteMap.get(trimmedRef)!});
        noteMap.delete(trimmedRef);
      }
    });
    
    verseMap.forEach(verse => unordered.push({type: 'verse', data: verse}));
    noteMap.forEach(note => unordered.push({type: 'note', data: note}));
    
    console.log('Initializing reorderedData with:', ordered.length + unordered.length, 'items (', verses.length, 'verses,', notes.length, 'notes) for collection:', collection.title);
    setReorderedData([...ordered, ...unordered]);
    setIsLoading(false);
  }, [collection?.userVerses, collection?.notes, collection?.verseOrder, collection?.collectionId]);

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
    console.log('handleDragEnd - updating reorderedData with', data.length, 'items for existing collection');
    setSaveButtonEnabled(true);
    setReorderedData(data);
  }, []);

  const handleSave = async () => {
    if (!collection?.collectionId) {
      console.error('No collection ID to update');
      return;
    }

    if (reorderedData.length === 0) {
      console.error('No items to save');
      return;
    }
    
    setIsSaving(true);
    console.log('Saving existing collection - reorderedData length:', reorderedData.length);
    
    // Create ordered lists and verseOrder directly from the mixed reorderedData,
    // preserving the exact user-defined order for both verses and notes.
    const reorderedVerses: UserVerse[] = [];
    const reorderedNotes: CollectionNote[] = [];
    const orderTokens: string[] = [];

    for (const item of reorderedData) {
      if (item.type === 'verse') {
        reorderedVerses.push(item.data);
        const ref = item.data.readableReference?.trim();
        if (ref) orderTokens.push(ref);
      } else {
        reorderedNotes.push(item.data);
        if (item.data.id) orderTokens.push(item.data.id);
      }
    }

    const verseOrder = orderTokens.join(',');
    
    console.log('Saving existing collection - verseOrder:', verseOrder);
    console.log('Saving existing collection - verses:', reorderedVerses.map(uv => uv.readableReference));
    console.log('Saving existing collection - notes:', reorderedNotes.map(n => n.id));
    
    try {
      // Update collection in database (includes verseOrder update)
      const updatedCollection: Collection = {
        ...collection,
        userVerses: reorderedVerses,
        notes: reorderedNotes,
        verseOrder: verseOrder
      };
      
      console.log('Updating existing collection with verseOrder:', verseOrder);
      await updateCollectionDB(updatedCollection);
      
      // Delete old user verses
      await deleteUserVersesFromCollection(collection.collectionId);
      
      // Add updated user verses (this will prevent duplicates)
      await addUserVersesToNewCollection(reorderedVerses, collection.collectionId);
      
      // Fetch updated collections from server
      const updatedCollections = await getUserCollections(user.username);
      setCollections(updatedCollections);
      
      // Find the updated collection with server-ordered verses
      const updatedCol = updatedCollections.find(c => c.collectionId === collection.collectionId);
      console.log('Fetched collection verseOrder:', updatedCol?.verseOrder);
      console.log('Fetched collection userVerses:', updatedCol?.userVerses.map(uv => uv.readableReference));
      
      if (updatedCol) {
        // Preserve verse text from the reordered data
        const verseTextMap = new Map<string, UserVerse>();
        reorderedVerses.forEach(uv => {
          if (uv.readableReference && uv.verses && uv.verses.length > 0) {
            const key = uv.readableReference.trim().toLowerCase();
            verseTextMap.set(key, uv);
          }
        });
        
        // Merge verse text into updated collection
        const mergedUserVerses = (updatedCol.userVerses || []).map(uv => {
          const key = uv.readableReference?.trim().toLowerCase();
          const verseWithText = key ? verseTextMap.get(key) : null;
          return verseWithText || uv;
        });
        
        const finalCollection = {
          ...updatedCol,
          userVerses: mergedUserVerses,
          notes: reorderedNotes,
          verseOrder: verseOrder
        };
        
        // Update store with merged collection (preserving verse text)
        updateCollection(finalCollection);
        if (editingCollection?.collectionId === finalCollection.collectionId) {
          setEditingCollection(finalCollection);
        }
      }
      
      router.back();
    } catch (error) {
      console.error('Failed to save existing collection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.text}>Collection not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 15, backgroundColor: theme.colors.primary, borderRadius: 10 }}>
          <Text style={{ color: theme.colors.onPrimary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reorderedData.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={styles.text}>No passages or notes to reorder</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 15, backgroundColor: theme.colors.primary, borderRadius: 10 }}>
          <Text style={{ color: theme.colors.onPrimary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <DraggableFlatList
        data={reorderedData}
        renderItem={renderItem}
        keyExtractor={(item) => item.type === 'verse' 
          ? item.data.readableReference || item.data.verses[0]?.verse_reference || `verse-${Math.random()}`
          : item.data.id}
        onDragEnd={handleDragEnd}
        contentContainerStyle={{paddingBottom: 200}}
        onDragBegin={() => setSaveButtonEnabled(false)}
      />

      <View style={{
        position: 'absolute',
        bottom: 50,
        left: 20,
        width: '47%',
        height: 52,
        backgroundColor: 'transparent',
        borderRadius: 10,
        boxShadow: '0px 0px 43px 20px rgba(0,0,0,.2)',
        zIndex: 5,
      }}></View>

      <View style={{
        position: 'absolute',
        bottom: 50,
        right: 20,
        width: '47%',
        height: 52,
        backgroundColor: 'transparent',
        borderRadius: 10,
        boxShadow: '0px 0px 43px 20px rgba(0,0,0,.2)',
        zIndex: 5,
      }}></View>

      <View style={{
        flexDirection: 'row',
        position: 'absolute',
        bottom: 50,
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
