import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Portal, Snackbar, Checkbox } from 'react-native-paper';
import { addUserVersesToNewCollection, createCollectionDB, getMostRecentCollectionId, getUserCollections, refreshUser, updateCollectionDB, updateCollectionsOrder, addHighlight, removeHighlight, checkHighlight, createNote, getPublicNotesByVerseReference, VerseNote } from '../db';
import { Collection, UserVerse, Verse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import ShareVerseSheet from './shareVerseSheet';

interface VerseSheetProps {
    userVerse: UserVerse | null;
    visible: boolean;
    onClose: () => void;
    bookName: string;
    chapter: number;
    onHighlightChange?: () => void;
    onUnselectVerse?: (verseReference: string) => void;
}

export default function VerseSheet({ userVerse, visible, onClose, bookName, chapter, onHighlightChange, onUnselectVerse }: VerseSheetProps) {
    const styles = useStyles();
    const theme = useAppTheme();
    const user = useAppStore((state) => state.user);
    const collections = useAppStore((state) => state.collections);
    const setCollections = useAppStore((state) => state.setCollections);
    const verseSaveAdjustments = useAppStore((state) => state.verseSaveAdjustments);
    const incrementVerseSaveAdjustment = useAppStore((state) => state.incrementVerseSaveAdjustment);

    const [showCollectionPicker, setShowCollectionPicker] = useState(false);
    const [pickedCollection, setPickedCollection] = useState<Collection | undefined>(undefined);
    const [isAddingToCollection, setIsAddingToCollection] = useState(false);
    const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
    const [newCollectionTitle, setNewCollectionTitle] = useState('');
    const setUser = useAppStore((state) => state.setUser);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [versesToShare, setVersesToShare] = useState<UserVerse[]>([]);
    const [isHighlighted, setIsHighlighted] = useState(false);
    const [isTogglingHighlight, setIsTogglingHighlight] = useState(false);
    const [notes, setNotes] = useState<VerseNote[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [isPublicNote, setIsPublicNote] = useState(false);
    const [isCreatingNote, setIsCreatingNote] = useState(false);

    // Get verses from userVerse
    const verses = userVerse?.verses ?? [];
    const readableReference = userVerse?.readableReference ?? '';

    // Check if verse is highlighted when sheet opens
    React.useEffect(() => {
        if (visible && readableReference && user?.username) {
            // Check if any of the verses in the readable reference are highlighted
            const firstVerse = verses[0];
            if (firstVerse?.verse_reference) {
                checkHighlight(user.username, firstVerse.verse_reference).then(setIsHighlighted).catch(() => setIsHighlighted(false));
            } else {
                setIsHighlighted(false);
            }
        } else {
            setIsHighlighted(false);
        }
    }, [visible, readableReference, user?.username, verses]);

    // Load public notes when sheet opens
    useEffect(() => {
        if (visible && readableReference) {
            loadNotes();
        } else {
            setNotes([]);
        }
    }, [visible, readableReference]);

    const loadNotes = async () => {
        if (!readableReference) return;
        setLoadingNotes(true);
        try {
            const publicNotes = await getPublicNotesByVerseReference(readableReference);
            setNotes(publicNotes);
        } catch (error) {
            console.error('Error loading notes:', error);
        } finally {
            setLoadingNotes(false);
        }
    };

    const handleAddNote = () => {
        setNoteText('');
        setIsPublicNote(false);
        setShowAddNoteModal(true);
    };

    const handleCreateNote = async () => {
        if (!noteText.trim() || !user?.username || !readableReference || isCreatingNote) return;

        setIsCreatingNote(true);
        try {
            // Pass readableReference as both verseReference and originalReference
            // The server will parse it and create notes for all individual verses
            await createNote(readableReference, user.username, noteText.trim(), isPublicNote, readableReference);
            setShowAddNoteModal(false);
            setNoteText('');
            setIsPublicNote(false);
            setSnackbarMessage(isPublicNote ? 'Note created! It will be visible to others once approved.' : 'Note created!');
            setSnackbarVisible(true);
            // Reload notes if public
            if (isPublicNote) {
                await loadNotes();
            }
        } catch (error) {
            console.error('Error creating note:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create note';
            setSnackbarMessage(`Error creating note: ${errorMessage}`);
            setSnackbarVisible(true);
        } finally {
            setIsCreatingNote(false);
        }
    };

    const sheetRef = useRef<BottomSheet>(null);
    
    // Snap points for the bottom sheet
    const snapPoints = useMemo(() => ['35%', '90%'], []);

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleManualDismiss = useCallback(() => {
        sheetRef.current?.close();
    }, []);

    useEffect(() => {
        if (visible && userVerse) {
            sheetRef.current?.snapToIndex(0);
        } else {
            sheetRef.current?.close();
        }
    }, [visible, userVerse]);

    useEffect(() => {
        if (!visible) {
            setShowCollectionPicker(false);
            setVersesToShare([]);
            setShowAddNoteModal(false);
        }
    }, [visible]);

    const handleSaveVerse = () => {
        if (!userVerse || verses.length === 0) return;
        
        setPickedCollection(undefined);
        setNewCollectionTitle('');
        setShowCollectionPicker(true);
    };

    const handleInputChange = (text: string) => {
        setNewCollectionTitle(text);
        // Clear selected collection when user starts typing
        if (text.trim() && pickedCollection) {
            setPickedCollection(undefined);
        }
    };

    const handleCollectionSelect = (collection: Collection) => {
        setPickedCollection(collection);
        // Clear input when selecting an existing collection
        setNewCollectionTitle('');
    };

    const handleCreateNewCollection = async () => {
        if (!userVerse || !user?.username || isCreatingNewCollection || !newCollectionTitle.trim()) return;
        if (collections.length >= 40) {
            setSnackbarMessage('You can create up to 40 collections.');
            setSnackbarVisible(true);
            return;
        }

        setIsCreatingNewCollection(true);
        const userVerseToAdd: UserVerse = {
            ...userVerse,
            username: user.username,
        };

        try {
            const finalTitle = newCollectionTitle.trim() === '' ? 'New Collection' : (newCollectionTitle.trim() === 'Favorites' ? 'Favorites-Other' : newCollectionTitle.trim());
            const newCollection: Collection = {
                title: finalTitle,
                authorUsername: user.username,
                username: user.username,
                visibility: 'private',
                verseOrder: `${readableReference},`,
                userVerses: [userVerseToAdd],
                notes: [],
                favorites: false,
            };

            await createCollectionDB(newCollection, user.username);
            const collectionId = await getMostRecentCollectionId(user.username);
            await addUserVersesToNewCollection([userVerseToAdd], collectionId);
            
            const updatedCollections = await getUserCollections(user.username);
            setCollections(updatedCollections);

            const currentOrder = user.collectionsOrder ? user.collectionsOrder : '';
            const newOrder = currentOrder ? `${currentOrder},${collectionId}` : collectionId.toString();
            const updatedUser = { ...user, collectionsOrder: newOrder };
            setUser(updatedUser);
            await updateCollectionsOrder(newOrder, user.username);

            const refreshedUser = await refreshUser(user.username);
            setUser(refreshedUser);

            incrementVerseSaveAdjustment(readableReference);
            setShowCollectionPicker(false);
            setPickedCollection(undefined);
            setNewCollectionTitle('');
            setSnackbarMessage('Collection created and verse saved');
            setSnackbarVisible(true);
        } catch (error) {
            console.error('Failed to create collection:', error);
            setSnackbarMessage('Failed to create collection');
            setSnackbarVisible(true);
        } finally {
            setIsCreatingNewCollection(false);
        }
    };

    const handleAddToCollection = async () => {
        if (!pickedCollection || !userVerse || !user.username || isAddingToCollection) return;

        const readableRef = readableReference;
        
        // Check if verse already exists in collection
        const alreadyExists = pickedCollection.userVerses.some(
            uv => uv.readableReference === readableRef
        );

        if (alreadyExists) {
            setSnackbarMessage('This passage is already in the collection');
            setSnackbarVisible(true);
            setShowCollectionPicker(false);
            setPickedCollection(undefined);
            return;
        }

        setIsAddingToCollection(true);

        const userVerseToAdd: UserVerse = {
            ...userVerse,
            username: user.username,
        };

        try {
            // Add user verse to collection
            await addUserVersesToNewCollection([userVerseToAdd], pickedCollection.collectionId!);
            
            // Update verseOrder
            const currentOrder = pickedCollection.verseOrder || '';
            const newOrder = currentOrder ? `${currentOrder}${readableRef},` : `${readableRef},`;
            
            // Update collection in the database
            const updatedCollection = {
                ...pickedCollection,
                userVerses: [...pickedCollection.userVerses, userVerseToAdd],
                verseOrder: newOrder,
            };
            await updateCollectionDB(updatedCollection);

            // Update store
            setCollections(collections.map(c => 
                c.collectionId === pickedCollection.collectionId ? updatedCollection : c
            ));

            incrementVerseSaveAdjustment(readableRef);
            setShowCollectionPicker(false);
            setPickedCollection(undefined);
            setIsAddingToCollection(false);
            setSnackbarMessage('Verse added to collection!');
            setSnackbarVisible(true);
        } catch (error) {
            console.error('Error adding to collection:', error);
            setSnackbarMessage('Failed to add verse to collection');
            setSnackbarVisible(true);
            setIsAddingToCollection(false);
        }
    };


    const handleToggleHighlight = async () => {
        if (!user?.username || !readableReference || isTogglingHighlight) return;

        setIsTogglingHighlight(true);
        try {
            if (isHighlighted) {
                await removeHighlight(user.username, readableReference);
                setIsHighlighted(false);
                setSnackbarMessage('Highlight removed');
            } else {
                await addHighlight(user.username, readableReference);
                setIsHighlighted(true);
                setSnackbarMessage('Verse highlighted');
            }
            setSnackbarVisible(true);
            // Notify parent to refresh highlights
            if (onHighlightChange) {
                onHighlightChange();
            }
        } catch (error) {
            console.error('Error toggling highlight:', error);
            setSnackbarMessage('Failed to update highlight');
            setSnackbarVisible(true);
        } finally {
            setIsTogglingHighlight(false);
        }
    };

    if (!userVerse || verses.length === 0) return null;

    // Calculate total saved count from all verses
    const savedAdjustment = verseSaveAdjustments[readableReference] ?? 0;
    const totalSavedCount = verses.reduce((sum, verse) => {
        const verseRef = verse.verse_reference || readableReference;
        const verseAdjustment = verseSaveAdjustments[verseRef] ?? 0;
        return sum + (verse.users_Saved_Verse ?? 0) + verseAdjustment;
    }, 0);
    const displayedSavedCount = totalSavedCount + savedAdjustment;
    
    // Calculate total memorized count
    const totalMemorizedCount = verses.reduce((sum, verse) => sum + (verse.users_Memorized ?? 0), 0);

    const hasContent = !!userVerse && verses.length > 0;

    return (
        <>
            <Portal>
                <BottomSheet
                    ref={sheetRef}
                    index={visible ? 0 : -1}
                    snapPoints={snapPoints}
                    enablePanDownToClose
                    onChange={handleSheetChange}
                    backgroundStyle={{ backgroundColor: theme.colors.background }}
                    handleIndicatorStyle={{ backgroundColor: theme.colors.onBackground }}
                >
                {hasContent ? (
                    <BottomSheetScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    >
                        <View
                            style={{
                                paddingTop: 12,
                                paddingBottom: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 12,
                            }}
                        >
                            <TouchableOpacity 
                              onPress={handleManualDismiss} 
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: theme.colors.surface2,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Ionicons name="close" size={20} color={theme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>
                            <Text
                                style={{
                                    fontFamily: 'Noto Serif bold',
                                    fontSize: 28,
                                    color: theme.colors.onBackground,
                                    marginBottom: 20,
                                }}
                            >
                                {readableReference}
                            </Text>


                            {verses.length > 1 ? (
                                // Show individual stats for each verse when multiple verses are selected - Table format
                                <View style={{ marginBottom: 30 }}>
                                    {/* Table Header */}
                                    <View style={{ 
                                        flexDirection: 'row', 
                                        alignItems: 'flex-end',
                                        marginBottom: 12,
                                        paddingBottom: 8,
                                        borderBottomWidth: 1,
                                        borderBottomColor: theme.colors.outline
                                    }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ 
                                                color: theme.colors.onBackground, 
                                                fontSize: 14, 
                                                fontWeight: '600',
                                                fontFamily: 'Inter'
                                            }}>
                                                Reference
                                            </Text>
                                        </View>
                                        <View style={{ width: 80, alignItems: 'flex-end' }}>
                                            <Text style={{ 
                                                color: theme.colors.onSurfaceVariant, 
                                                fontSize: 11,
                                                fontWeight: '500',
                                                fontFamily: 'Inter',
                                                marginBottom: 4,
                                                textTransform: 'uppercase'
                                            }}>
                                                saves
                                            </Text>
                                        </View>
                                        <View style={{ width: 80, alignItems: 'flex-end' }}>
                                            <Text style={{ 
                                                color: theme.colors.onSurfaceVariant, 
                                                fontSize: 11,
                                                fontWeight: '500',
                                                fontFamily: 'Inter',
                                                marginBottom: 4,
                                                textTransform: 'uppercase'
                                            }}>
                                                memorized
                                            </Text>
                                        </View>
                                        {onUnselectVerse && (
                                            <View style={{ width: 60 }} />
                                        )}
                                    </View>
                                    
                                    {/* Table Rows */}
                                    {verses.map((verse, index) => {
                                        const verseRef = verse.verse_reference || `${readableReference}:${verse.verse_Number || index + 1}`;
                                        const verseAdjustment = verseSaveAdjustments[verseRef] ?? 0;
                                        const verseSavedCount = (verse.users_Saved_Verse ?? 0) + verseAdjustment;
                                        const verseMemorizedCount = verse.users_Memorized ?? 0;
                                        
                                        return (
                                            <View 
                                                key={verseRef || index} 
                                                style={{ 
                                                    flexDirection: 'row', 
                                                    alignItems: 'center',
                                                    paddingVertical: 8,
                                                    borderBottomWidth: index < verses.length - 1 ? 1 : 0,
                                                    borderBottomColor: theme.colors.outline,
                                                    opacity: 0.7
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ 
                                                        color: theme.colors.onBackground, 
                                                        fontSize: 14,
                                                        fontFamily: 'Inter'
                                                    }}>
                                                        {verseRef}
                                                    </Text>
                                                </View>
                                                <View style={{ width: 80, alignItems: 'flex-end' }}>
                                                    <Text style={{ 
                                                        color: theme.colors.onSurfaceVariant, 
                                                        fontSize: 13
                                                    }}>
                                                        {verseSavedCount}
                                                    </Text>
                                                </View>
                                                <View style={{ width: 80, alignItems: 'flex-end' }}>
                                                    <Text style={{ 
                                                        color: theme.colors.onSurfaceVariant, 
                                                        fontSize: 13
                                                    }}>
                                                        {verseMemorizedCount}
                                                    </Text>
                                                </View>
                                                {onUnselectVerse && (
                                                    <View style={{ width: 60, alignItems: 'flex-end' }}>
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                if (verseRef && onUnselectVerse) {
                                                                    onUnselectVerse(verseRef);
                                                                }
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text style={{
                                                                color: theme.colors.error,
                                                                fontSize: 13,
                                                                textDecorationLine: 'underline'
                                                            }}>
                                                                Remove
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : (
                                // Show aggregate stats for single verse (existing behavior)
                                <View style={{ marginBottom: 30 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <Ionicons name="people" size={18} color={theme.colors.onBackground} />
                                        <Text style={{ color: theme.colors.onBackground, fontSize: 14, marginLeft: 10 }}>
                                            {displayedSavedCount} {displayedSavedCount === 1 ? 'save' : 'saves'}
                                        </Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="checkmark-done" size={18} color={theme.colors.onBackground} />
                                        <Text style={{ color: theme.colors.onBackground, fontSize: 14, marginLeft: 10 }}>
                                            {totalMemorizedCount} {totalMemorizedCount === 1 ? 'memorized' : 'memorized'}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                                <TouchableOpacity onPress={handleSaveVerse} activeOpacity={0.1} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="bookmark-outline" size={18} color={theme.colors.onBackground} />
                                    <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                    activeOpacity={0.1}
                                    onPress={handleToggleHighlight}
                                    disabled={isTogglingHighlight || !user?.username}
                                >
                                    <Ionicons
                                        name={isHighlighted ? 'color-fill' : 'color-fill-outline'}
                                        size={18}
                                        color={isHighlighted ? theme.colors.primary : theme.colors.onBackground}
                                    />
                                    <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>
                                        {isHighlighted ? 'Unhighlight' : 'Highlight'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                    activeOpacity={0.1}
                                    onPress={() => {
                                        if (userVerse) {
                                            setVersesToShare([userVerse]);
                                        }
                                    }}
                                >
                                    <Ionicons name="share-social-outline" size={18} color={theme.colors.onBackground} />
                                    <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Share</Text>
                                </TouchableOpacity>
                                {user?.username && (
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center' }}
                                        activeOpacity={0.1}
                                        onPress={handleAddNote}
                                    >
                                        <Ionicons name="document-text-outline" size={18} color={theme.colors.onBackground} />
                                        <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Note</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={{ marginTop: 20, marginBottom: 20 }}>
                                <Text
                                    style={{
                                        fontFamily: 'Noto Serif bold',
                                        fontSize: 20,
                                        color: theme.colors.onBackground,
                                        marginBottom: 12,
                                    }}
                                >
                                    Notes
                                </Text>
                                {loadingNotes ? (
                                    <ActivityIndicator size="small" color={theme.colors.onBackground} />
                                ) : notes.length === 0 ? (
                                    <Text style={{ color: theme.colors.onBackground, fontSize: 14, fontStyle: 'italic' }}>
                                        No public notes yet. Be the first to add one!
                                    </Text>
                                ) : (
                                    <View>
                                        {notes.map((note) => (
                                            <View
                                                key={note.id}
                                                style={{
                                                    backgroundColor: theme.colors.surface,
                                                    padding: 12,
                                                    borderRadius: 8,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <Text style={{ color: theme.colors.onBackground, fontSize: 12, fontWeight: '600' }}>
                                                        {note.username}
                                                    </Text>
                                                </View>
                                                {note.originalReference && note.originalReference !== note.verseReference && (
                                                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginBottom: 4, fontStyle: 'italic' }}>
                                                        {note.originalReference}
                                                    </Text>
                                                )}
                                                <Text style={{ color: theme.colors.onBackground, fontSize: 14, lineHeight: 20 }}>
                                                    {note.text}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                    </BottomSheetScrollView>
                ) : (
                    <BottomSheetView style={{ height: 1 }}>
                        <View />
                    </BottomSheetView>
                )}
            </BottomSheet>
            </Portal>

            {/* Collection Picker Modal */}
            <Portal>
                <Modal
                    visible={showCollectionPicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowCollectionPicker(false)}
                >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <View style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: 16,
                        width: '85%',
                        maxHeight: '70%',
                        padding: 20,
                    }}>
                        <Text style={{
                            fontFamily: 'Noto Serif bold',
                            fontSize: 20,
                            color: theme.colors.onBackground,
                            marginBottom: 20,
                        }}>
                            Choose a Collection
                        </Text>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, color: theme.colors.onBackground, marginBottom: 8, fontFamily: 'Inter', fontWeight: '600' }}>
                                New Collection Title
                            </Text>
                            <TextInput
                                value={newCollectionTitle}
                                onChangeText={handleInputChange}
                                placeholder="Enter title to create new collection"
                                placeholderTextColor={theme.colors.onSurfaceVariant}
                                style={{
                                    borderWidth: 1,
                                    borderColor: theme.colors.onSurfaceVariant,
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 16,
                                    fontFamily: 'Inter',
                                    color: theme.colors.onBackground,
                                    backgroundColor: theme.colors.background,
                                }}
                            />
                        </View>
                        <Text style={{ fontSize: 14, color: theme.colors.onBackground, marginBottom: 8, fontFamily: 'Inter', fontWeight: '600' }}>
                            Or select existing collection
                        </Text>
                        <ScrollView>
                            {(() => {
                                // Filter to only show collections owned by the user
                                const userOwnedCollections = collections.filter(col => {
                                    const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
                                    const owner = col.username ? normalize(col.username) : undefined;
                                    const author = col.authorUsername ? normalize(col.authorUsername) : undefined;
                                    const currentUser = normalize(user?.username);
                                    
                                    // Collection is owned by user if username matches OR authorUsername matches (and username is not set or also matches)
                                    return (owner === currentUser) || (author === currentUser && (!owner || owner === currentUser));
                                });
                                
                                // Separate favorites and non-favorites, same logic as index.tsx
                                const favorites = userOwnedCollections.filter(col => col.favorites || col.title === 'Favorites');
                                const nonFavorites = userOwnedCollections.filter(col => !col.favorites && col.title !== 'Favorites');
                                
                                return (
                                    <>
                                        {/* Favorites first with star icon */}
                                        {favorites.map((collection) => (
                                            <TouchableOpacity
                                                key={collection.collectionId}
                                                style={{
                                                    paddingVertical: 12,
                                                    paddingHorizontal: 16,
                                                    marginBottom: 8,
                                                    backgroundColor: pickedCollection?.collectionId === collection.collectionId 
                                                        ? theme.colors.primary 
                                                        : 'transparent',
                                                    borderRadius: 8,
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                }}
                                                onPress={() => handleCollectionSelect(collection)}
                                            >
                                                <Text style={{
                                                    ...styles.tinyText,
                                                    fontSize: 16,
                                                    color: pickedCollection?.collectionId === collection.collectionId 
                                                        ? '#fff' 
                                                        : theme.colors.onBackground,
                                                }}>
                                                    {collection.title}
                                                </Text>
                                                <Ionicons 
                                                    name="star" 
                                                    size={20} 
                                                    color={pickedCollection?.collectionId === collection.collectionId 
                                                        ? '#fff' 
                                                        : theme.colors.onBackground} 
                                                />
                                            </TouchableOpacity>
                                        ))}
                                        
                                        {/* Other Collections */}
                                        {nonFavorites.map((collection) => (
                                            <TouchableOpacity
                                                key={collection.collectionId}
                                                style={{
                                                    paddingVertical: 12,
                                                    paddingHorizontal: 16,
                                                    marginBottom: 8,
                                                    backgroundColor: pickedCollection?.collectionId === collection.collectionId 
                                                        ? theme.colors.primary 
                                                        : 'transparent',
                                                    borderRadius: 8,
                                                }}
                                                onPress={() => handleCollectionSelect(collection)}
                                            >
                                                <Text style={{
                                                    ...styles.tinyText,
                                                    fontSize: 16,
                                                    color: pickedCollection?.collectionId === collection.collectionId 
                                                        ? '#fff' 
                                                        : theme.colors.onBackground,
                                                }}>
                                                    {collection.title}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                );
                            })()}
                        </ScrollView>

                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginTop: 20,
                        }}>
                            <TouchableOpacity
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 24,
                                    borderRadius: 8,
                                }}
                                onPress={() => {
                                    setPickedCollection(undefined);
                                    setNewCollectionTitle('');
                                    setShowCollectionPicker(false);
                                }}
                            >
                                <Text style={{
                                    ...styles.tinyText,
                                    color: theme.colors.onBackground,
                                }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            {newCollectionTitle.trim() ? (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: theme.colors.primary,
                                        paddingVertical: 12,
                                        paddingHorizontal: 24,
                                        borderRadius: 8,
                                        opacity: (!newCollectionTitle.trim() || isCreatingNewCollection) ? 0.5 : 1
                                    }}
                                    onPress={handleCreateNewCollection}
                                    disabled={!newCollectionTitle.trim() || isCreatingNewCollection}
                                >
                                    {isCreatingNewCollection ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={{
                                            ...styles.tinyText,
                                            color: '#fff',
                                        }}>
                                            Create
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: theme.colors.primary,
                                        paddingVertical: 12,
                                        paddingHorizontal: 24,
                                        borderRadius: 8,
                                        opacity: (!pickedCollection || isAddingToCollection) ? 0.5 : 1
                                    }}
                                    onPress={handleAddToCollection}
                                    disabled={!pickedCollection || isAddingToCollection}
                                >
                                    {isAddingToCollection ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={{
                                            ...styles.tinyText,
                                            color: '#fff',
                                        }}>
                                            Add
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
            </Portal>

            <Portal>
                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={3000}
                    style={{ backgroundColor: theme.colors.surface }}
                >
                    <Text style={{ color: theme.colors.onSurface }}>
                        {snackbarMessage}
                    </Text>
                </Snackbar>
            </Portal>

            {/* Add Note Modal */}
            <Modal
                visible={showAddNoteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAddNoteModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <View style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: 16,
                        width: '85%',
                        maxHeight: '70%',
                        padding: 20,
                    }}>
                        <Text style={{
                            fontFamily: 'Noto Serif bold',
                            fontSize: 20,
                            color: theme.colors.onBackground,
                            marginBottom: 20,
                        }}>
                            Add Note
                        </Text>

                        <TextInput
                            style={{
                                backgroundColor: theme.colors.background,
                                borderRadius: 8,
                                padding: 12,
                                color: theme.colors.onBackground,
                                fontSize: 14,
                                minHeight: 100,
                                textAlignVertical: 'top',
                                marginBottom: 16,
                            }}
                            placeholder="Enter your note..."
                            placeholderTextColor={theme.colors.onBackground + '80'}
                            multiline
                            numberOfLines={4}
                            value={noteText}
                            onChangeText={setNoteText}
                        />

                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}
                            onPress={() => setIsPublicNote(!isPublicNote)}
                            activeOpacity={0.7}
                        >
                            <Checkbox
                                status={isPublicNote ? 'checked' : 'unchecked'}
                                onPress={() => setIsPublicNote(!isPublicNote)}
                                color={theme.colors.primary}
                                uncheckedColor={theme.colors.onSurfaceVariant}
                            />
                            <Text style={{
                                color: theme.colors.onBackground,
                                fontSize: 14,
                                marginLeft: 8,
                            }}>
                                Make this note public (visible to all users)
                            </Text>
                        </TouchableOpacity>

                        <Text style={{
                            color: theme.colors.onSurfaceVariant,
                            fontSize: 11,
                            marginBottom: 16,
                            fontStyle: 'italic',
                        }}>
                            (notes are encrypted before they are stored)
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }}>
                            <TouchableOpacity
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 24,
                                    borderRadius: 8,
                                }}
                                onPress={() => {
                                    setShowAddNoteModal(false);
                                    setNoteText('');
                                    setIsPublicNote(false);
                                }}
                            >
                                <Text style={{
                                    ...styles.tinyText,
                                    color: theme.colors.onBackground,
                                }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: theme.colors.primary,
                                    paddingVertical: 12,
                                    paddingHorizontal: 24,
                                    borderRadius: 8,
                                }}
                                onPress={handleCreateNote}
                                disabled={!noteText.trim() || isCreatingNote}
                            >
                                {isCreatingNote ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{
                                        ...styles.tinyText,
                                        color: '#fff',
                                    }}>
                                        Create
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ShareVerseSheet
                visible={versesToShare.length > 0}
                userVerses={versesToShare}
                onClose={() => setVersesToShare([])}
                onShareSuccess={(friend) => { 
                    setVersesToShare([]); 
                    setSnackbarMessage(`Verse shared with ${friend}`); 
                    setSnackbarVisible(true); 
                }}
                onShareError={() => { 
                    setSnackbarMessage('Failed to share verse'); 
                    setSnackbarVisible(true); 
                }}
            />
        </>
    );
}

