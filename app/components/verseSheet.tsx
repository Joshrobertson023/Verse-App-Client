import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Checkbox, Portal, Snackbar } from 'react-native-paper';
import { formatDate } from '../dateUtils';
import { addHighlight, addUserVersesToNewCollection, checkHighlight, createCollectionDB, createNote, deleteNote, getMostRecentCollectionId, getNotesByVerseReference, getPublicNotesByVerseReference, getUserCollections, likeNote, refreshUser, removeHighlight, unlikeNote, updateCollectionDB, updateCollectionsOrder, updateNote, VerseNote } from '../db';
import { Collection, useAppStore, UserVerse } from '../store';
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
    const [privateNotes, setPrivateNotes] = useState<VerseNote[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [loadingPrivateNotes, setLoadingPrivateNotes] = useState(false);
    // Notes for each individual verse when multiple verses are selected
    const [verseNotes, setVerseNotes] = useState<Map<string, { public: VerseNote[], private: VerseNote[] }>>(new Map());
    const [loadingVerseNotes, setLoadingVerseNotes] = useState<Set<string>>(new Set());
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [isPublicNote, setIsPublicNote] = useState(false);
    const [isCreatingNote, setIsCreatingNote] = useState(false);
    const [editingNote, setEditingNote] = useState<VerseNote | null>(null);
    const [isDeletingNote, setIsDeletingNote] = useState(false);
    const [isUpdatingNote, setIsUpdatingNote] = useState(false);

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

    // Load public and private notes when sheet opens
    useEffect(() => {
        if (visible && readableReference) {
            loadNotes();
            loadPrivateNotes();
        } else {
            setNotes([]);
            setPrivateNotes([]);
        }
    }, [visible, readableReference]);

    const loadNotes = async () => {
        if (!readableReference) return;
        setLoadingNotes(true);
        try {
            const publicNotes = await getPublicNotesByVerseReference(readableReference, user?.username);
            setNotes(publicNotes);
        } catch (error) {
            console.error('Error loading notes:', error);
        } finally {
            setLoadingNotes(false);
        }
    };

    const loadPrivateNotes = async () => {
        if (!readableReference || !user?.username || !bookName || !chapter) return;
        setLoadingPrivateNotes(true);
        try {
            // Get private notes for the current verse reference
            const userNotes = await getNotesByVerseReference(readableReference, user.username);
            const privateUserNotes = userNotes.filter((note: VerseNote) => !note.isPublic);
            setPrivateNotes(privateUserNotes);
        } catch (error) {
            console.error('Error loading private notes:', error);
        } finally {
            setLoadingPrivateNotes(false);
        }
    };

    const handleAddNote = () => {
        setNoteText('');
        setIsPublicNote(false);
        setEditingNote(null);
        setShowAddNoteModal(true);
    };

    const handleEditNote = (note: VerseNote) => {
        setEditingNote(note);
        setNoteText(note.text);
        setIsPublicNote(note.isPublic);
        setShowAddNoteModal(true);
    };

    const handleUpdateNote = async () => {
        if (!editingNote || !noteText.trim() || !user?.username || isUpdatingNote) return;

        setIsUpdatingNote(true);
        try {
            const updatedNote = await updateNote(editingNote.id, noteText.trim());
            
            if (verses.length > 1) {
                // Update in verseNotes map
                setVerseNotes(prev => {
                    const newMap = new Map(prev);
                    for (const verse of verses) {
                        const verseRef = verse.verse_reference;
                        if (verseRef) {
                            const existing = newMap.get(verseRef) || { public: [], private: [] };
                            if (editingNote.isPublic) {
                                newMap.set(verseRef, {
                                    public: existing.public.map(n => n.id === editingNote.id ? updatedNote : n),
                                    private: existing.private
                                });
                            } else {
                                newMap.set(verseRef, {
                                    public: existing.public,
                                    private: existing.private.map(n => n.id === editingNote.id ? updatedNote : n)
                                });
                            }
                        }
                    }
                    return newMap;
                });
            } else {
                if (editingNote.isPublic) {
                    setNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
                } else {
                    setPrivateNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
                }
            }
            
            setShowAddNoteModal(false);
            setNoteText('');
            setEditingNote(null);
            setIsPublicNote(false);
        } catch (error) {
            console.error('Error updating note:', error);
        } finally {
            setIsUpdatingNote(false);
        }
    };

    const handleDeleteNote = async (note: VerseNote) => {
        if (!user?.username || isDeletingNote) return;

        setIsDeletingNote(true);
        try {
            await deleteNote(note.id);
            
            if (verses.length > 1) {
                // Remove from verseNotes map
                setVerseNotes(prev => {
                    const newMap = new Map(prev);
                    for (const verse of verses) {
                        const verseRef = verse.verse_reference;
                        if (verseRef) {
                            const existing = newMap.get(verseRef) || { public: [], private: [] };
                            if (note.isPublic) {
                                newMap.set(verseRef, {
                                    public: existing.public.filter(n => n.id !== note.id),
                                    private: existing.private
                                });
                            } else {
                                newMap.set(verseRef, {
                                    public: existing.public,
                                    private: existing.private.filter(n => n.id !== note.id)
                                });
                            }
                        }
                    }
                    return newMap;
                });
            } else {
                if (note.isPublic) {
                    setNotes(prev => prev.filter(n => n.id !== note.id));
                } else {
                    setPrivateNotes(prev => prev.filter(n => n.id !== note.id));
                }
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        } finally {
            setIsDeletingNote(false);
        }
    };

    const handleCreateNote = async () => {
        if (editingNote) {
            await handleUpdateNote();
            return;
        }
        if (!noteText.trim() || !user?.username || !readableReference || isCreatingNote) return;

        setIsCreatingNote(true);
        try {
            // Pass readableReference as both verseReference and originalReference
            // The server will parse it and create notes for all individual verses
            const createdNote = await createNote(readableReference, user.username, noteText.trim(), isPublicNote, readableReference);
            setShowAddNoteModal(false);
            setNoteText('');
            setIsPublicNote(false);
            
            // Add note to memory immediately and reload
            const noteWithApproved = { ...createdNote, approved: true };
            
            if (verses.length > 1) {
                // Multiple verses mode - add note to memory for each verse, then reload
                for (const verse of verses) {
                    const verseRef = verse.verse_reference;
                    if (verseRef) {
                        // Add note to memory immediately
                        setVerseNotes(prev => {
                            const newMap = new Map(prev);
                            const existing = newMap.get(verseRef) || { public: [], private: [] };
                            if (isPublicNote) {
                                newMap.set(verseRef, {
                                    public: [...existing.public, noteWithApproved],
                                    private: existing.private
                                });
                            } else {
                                newMap.set(verseRef, {
                                    public: existing.public,
                                    private: [...existing.private, noteWithApproved]
                                });
                            }
                            return newMap;
                        });
                        // Reload to get any other updates, but preserve our newly created note
                        const reloadedData = await Promise.all([
                            getPublicNotesByVerseReference(verseRef, user?.username),
                            getNotesByVerseReference(verseRef, user.username)
                        ]);
                        const [reloadedPublic, allReloaded] = reloadedData;
                        const reloadedPrivate = allReloaded.filter((note: VerseNote) => !note.isPublic);
                        
                        setVerseNotes(prev => {
                            const newMap = new Map(prev);
                            
                            // Merge reloaded notes with our created note
                            const mergedPublic = [...reloadedPublic];
                            const hasCreatedInPublic = mergedPublic.some(n => n.id === createdNote.id);
                            if (!hasCreatedInPublic && isPublicNote) {
                                mergedPublic.push(noteWithApproved);
                            }
                            
                            const mergedPrivate = [...reloadedPrivate];
                            const hasCreatedInPrivate = mergedPrivate.some(n => n.id === createdNote.id);
                            if (!hasCreatedInPrivate && !isPublicNote) {
                                mergedPrivate.push(noteWithApproved);
                            }
                            
                            newMap.set(verseRef, {
                                public: mergedPublic,
                                private: mergedPrivate
                            });
                            return newMap;
                        });
                    }
                }
            } else {
                // Single verse mode - add to memory immediately with approved status
                if (isPublicNote) {
                    setNotes(prev => {
                        // Check if note already exists (from reload), if not add it
                        const exists = prev.some(n => n.id === createdNote.id);
                        if (exists) {
                            // Update existing note
                            return prev.map(n => n.id === createdNote.id ? noteWithApproved : n);
                        }
                        return [...prev, noteWithApproved];
                    });
                } else {
                    setPrivateNotes(prev => {
                        const exists = prev.some(n => n.id === createdNote.id);
                        if (exists) {
                            return prev.map(n => n.id === createdNote.id ? noteWithApproved : n);
                        }
                        return [...prev, noteWithApproved];
                    });
                }
                // Reload to get any other updates, but merge with existing notes
                const reloadedPublicNotes = await getPublicNotesByVerseReference(readableReference, user?.username);
                const reloadedPrivateNotes = user?.username && bookName && chapter
                    ? (await getNotesByVerseReference(readableReference, user.username)).filter((note: VerseNote) => !note.isPublic)
                    : [];
                
                // Merge reloaded notes with the note we just created
                setNotes(prev => {
                    const merged = [...reloadedPublicNotes];
                    // Add our created note if it's not in the reloaded list
                    const hasCreatedNote = merged.some(n => n.id === createdNote.id);
                    if (!hasCreatedNote && isPublicNote) {
                        merged.push(noteWithApproved);
                    }
                    return merged;
                });
                
                if (user?.username && bookName && chapter) {
                    setPrivateNotes(prev => {
                        const merged = [...reloadedPrivateNotes];
                        const hasCreatedNote = merged.some(n => n.id === createdNote.id);
                        if (!hasCreatedNote && !isPublicNote) {
                            merged.push(noteWithApproved);
                        }
                        return merged;
                    });
                }
            }
        } catch (error) {
            console.error('Error creating note:', error);
        } finally {
            setIsCreatingNote(false);
        }
    };

    const sheetRef = useRef<BottomSheet>(null);
    
    // Snap points for the bottom sheet
    const snapPoints = useMemo(() => ['20%', '90%'], []);

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleManualDismiss = useCallback(() => {
        try {
            // Dismiss keyboard before closing to prevent crashes
            const { Keyboard } = require('react-native');
            Keyboard.dismiss();
            // Small delay to ensure keyboard is dismissed
            setTimeout(() => {
                sheetRef.current?.close();
            }, 100);
        } catch (error) {
            console.error('Error dismissing sheet:', error);
            sheetRef.current?.close();
        }
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

    // Load notes for each verse when multiple verses are selected
    const loadNotesForVerse = useCallback(async (verseRef: string) => {
        if (!user?.username || loadingVerseNotes.has(verseRef)) return;
        
        setLoadingVerseNotes(prev => new Set(prev).add(verseRef));
        try {
            const [publicNotes, allNotes] = await Promise.all([
                getPublicNotesByVerseReference(verseRef, user.username),
                getNotesByVerseReference(verseRef, user.username)
            ]);
            const privateUserNotes = allNotes.filter((note: VerseNote) => !note.isPublic);
            
            setVerseNotes(prev => {
                const newMap = new Map(prev);
                newMap.set(verseRef, { public: publicNotes, private: privateUserNotes });
                return newMap;
            });
        } catch (error) {
            console.error(`Error loading notes for ${verseRef}:`, error);
        } finally {
            setLoadingVerseNotes(prev => {
                const newSet = new Set(prev);
                newSet.delete(verseRef);
                return newSet;
            });
        }
    }, [user?.username, loadingVerseNotes]);

    // Load notes for all verses when sheet opens with multiple verses
    useEffect(() => {
        if (visible && verses.length > 1 && user?.username) {
            verses.forEach(verse => {
                const verseRef = verse.verse_reference;
                if (verseRef && !verseNotes.has(verseRef)) {
                    loadNotesForVerse(verseRef);
                }
            });
        }
    }, [visible, verses, user?.username, verseNotes, loadNotesForVerse]);

    // Helper function to check if a verse reference contains multiple verses (e.g., "Genesis 1:1-2")
    const isMultiVerseReference = (ref: string): boolean => {
        if (!ref) return false;
        // Check if reference contains a dash followed by a number (e.g., "1:1-2" or "1:1-3:5")
        return /:\d+-\d+/.test(ref) || /-\d+/.test(ref);
    };

    // Combine all private notes from all verses and sort by date
    const allPrivateNotes = useMemo(() => {
        if (verses.length <= 1) {
            return privateNotes;
        }
        const combined: VerseNote[] = [];
        const seenNoteIds = new Set<number>();
        verses.forEach(verse => {
            const verseRef = verse.verse_reference;
            if (verseRef) {
                const notesForVerse = verseNotes.get(verseRef);
                if (notesForVerse?.private) {
                    notesForVerse.private.forEach(note => {
                        // Deduplicate by note ID - each note should only appear once
                        if (note.id && !seenNoteIds.has(note.id)) {
                            seenNoteIds.add(note.id);
                            combined.push(note);
                        }
                    });
                }
            }
        });
        // Sort by date created (most recent first)
        return combined.sort((a, b) => {
            const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
            const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
            return dateB - dateA;
        });
    }, [verses, verseNotes, privateNotes]);

    // Combine all public notes from all verses and sort by date
    const allPublicNotes = useMemo(() => {
        if (verses.length <= 1) {
            return notes;
        }
        const combined: VerseNote[] = [];
        const seenNoteIds = new Set<number>();
        verses.forEach(verse => {
            const verseRef = verse.verse_reference;
            if (verseRef) {
                const notesForVerse = verseNotes.get(verseRef);
                if (notesForVerse?.public) {
                    notesForVerse.public.forEach(note => {
                        // Deduplicate by note ID - each note should only appear once
                        if (note.id && !seenNoteIds.has(note.id)) {
                            seenNoteIds.add(note.id);
                            combined.push(note);
                        }
                    });
                }
            }
        });
        // Sort by date created (most recent first)
        return combined.sort((a, b) => {
            const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
            const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
            return dateB - dateA;
        });
    }, [verses, verseNotes, notes]);

    // Check if any verse notes are still loading
    const isLoadingAnyVerseNotes = useMemo(() => {
        if (verses.length <= 1) return false;
        return verses.some(verse => {
            const verseRef = verse.verse_reference;
            return verseRef && loadingVerseNotes.has(verseRef);
        });
    }, [verses, loadingVerseNotes]);

    // Calculate note card width for snap scrolling
    const noteCardWidth = useMemo(() => {
        return Dimensions.get('window').width * 0.75;
    }, []);

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
        
        // Check collection limit based on paid status
        const maxCollections = user.isPaid ? 40 : 5;
        if (collections.length >= maxCollections) {
            if (!user.isPaid) {
                router.push('/pro');
                return;
            }
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
        
        // Check verse limit per collection for free users
        if (!user.isPaid) {
            const currentVerseCount = pickedCollection.userVerses?.length ?? 0;
            const maxVersesPerCollection = 10;
            
            if (currentVerseCount >= maxVersesPerCollection) {
                router.push('/pro');
                return;
            }
        }
        
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
            } else {
                await addHighlight(user.username, readableReference);
                setIsHighlighted(true);
            }
            // Notify parent to refresh highlights
            if (onHighlightChange) {
                onHighlightChange();
            }
        } catch (error) {
            console.error('Error toggling highlight:', error);
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
                    enableOverDrag={false}
                    android_keyboardInputMode="adjustResize"
                    keyboardBehavior="interactive"
                    keyboardBlurBehavior="restore"
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
                                marginTop: 8,
                                paddingBottom: 8,
                                marginBottom: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: 'Noto Serif bold',
                                    fontSize: 28,
                                    color: theme.colors.onBackground,
                                }}
                            >
                                {readableReference}
                            </Text>
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


                            {verses.length > 1 ? (
                                // Show individual stats for each verse when multiple verses are selected - Table format
                                <View style={{ marginTop: 0, marginBottom: 0 }}>
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
                                <View style={{ marginTop: 0, marginBottom: 0 }}>
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

                            <View style={{ flexDirection: 'row', gap: 16, marginTop: 40, marginBottom: 20, flexWrap: 'wrap' }}>
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

                            {user?.username && (
                            <View style={{ marginTop: 20, marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text
                                        style={{
                                            fontFamily: 'Noto Serif bold',
                                            fontSize: 20,
                                            color: theme.colors.onBackground,
                                        }}
                                    >
                                        Private Notes
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            onClose();
                                            router.push({
                                                pathname: '/notes/chapter/[bookName]/[chapter]',
                                                params: { bookName: encodeURIComponent(bookName), chapter: chapter.toString(), type: 'private' }
                                            } as any);
                                        }}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                        }}
                                    >
                                        <Text style={{
                                            color: theme.colors.onBackground,
                                            fontSize: 14,
                                            fontWeight: '600',
                                            fontFamily: 'Inter'
                                        }}>
                                            See All
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {verses.length > 1 ? (
                                    // Multiple verses - combine all notes into one horizontal scroll section
                                    isLoadingAnyVerseNotes ? (
                                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                                    ) : allPrivateNotes.length === 0 ? (
                                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, fontStyle: 'italic' }}>
                                            No private notes
                                        </Text>
                                    ) : (
                                        <ScrollView 
                                            horizontal 
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ paddingRight: 20 }}
                                            snapToInterval={noteCardWidth + 13}
                                            snapToAlignment="start"
                                            decelerationRate="fast"
                                            pagingEnabled={false}
                                        >
                                            {allPrivateNotes.map((note, noteIndex) => {
                                                const noteIsMultiVerse = isMultiVerseReference(note.verseReference || '');
                                                return (
                                                <View key={note.id} style={{ flexDirection: 'row' }}>
                                                    <View style={{ width: Dimensions.get('window').width * 0.75, position: 'relative' }}>
                                                        {/* Show verse reference when multiple verses are selected, but hide if note is for multiple verses */}
                                                        {!noteIsMultiVerse && (
                                                            <Text style={{ 
                                                                color: theme.colors.onBackground, 
                                                                fontSize: 12, 
                                                                fontWeight: '600', 
                                                                marginBottom: 4,
                                                                fontFamily: 'Inter'
                                                            }}>
                                                                {note.verseReference}
                                                            </Text>
                                                        )}
                                                        {note.originalReference && note.originalReference !== note.verseReference && (
                                                            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginBottom: 4, fontStyle: 'italic' }}>
                                                                {note.originalReference}
                                                            </Text>
                                                        )}
                                                        <Text style={{ color: theme.colors.onBackground, fontSize: 14, lineHeight: 20 }}>
                                                            {note.text}
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                                            {note.createdDate && (
                                                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
                                                                    {formatDate(note.createdDate)}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        {note.username === user?.username && (
                                                            <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 }}>
                                                                <TouchableOpacity
                                                                    onPress={() => handleEditNote(note)}
                                                                    disabled={isDeletingNote || isUpdatingNote}
                                                                    style={{ padding: 4 }}
                                                                >
                                                                    <Ionicons name="pencil" size={16} color={theme.colors.onBackground} />
                                                                </TouchableOpacity>
                                                                <TouchableOpacity
                                                                    onPress={() => handleDeleteNote(note)}
                                                                    disabled={isDeletingNote || isUpdatingNote}
                                                                    style={{ padding: 4 }}
                                                                >
                                                                    {isDeletingNote ? (
                                                                        <ActivityIndicator size="small" color={theme.colors.error} />
                                                                    ) : (
                                                                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                                                    )}
                                                                </TouchableOpacity>
                                                            </View>
                                                        )}
                                                    </View>
                                                    {noteIndex < allPrivateNotes.length - 1 && (
                                                        <View style={{ width: 1, backgroundColor: theme.colors.outline, marginHorizontal: 6 }} />
                                                    )}
                                                </View>
                                            );
                                            })}
                                        </ScrollView>
                                    )
                                ) : (
                                    // Single verse - existing behavior
                                    loadingPrivateNotes ? (
                                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                                    ) : privateNotes.length === 0 ? (
                                        <Text style={{ color: theme.colors.onBackground, fontSize: 14, fontStyle: 'italic' }}>
                                            No private notes
                                        </Text>
                                    ) : (
                                        <ScrollView 
                                            horizontal 
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ paddingRight: 20 }}
                                            snapToInterval={noteCardWidth + 13}
                                            snapToAlignment="start"
                                            decelerationRate="fast"
                                            pagingEnabled={false}
                                        >
                                            {privateNotes.map((note, index) => (
                                                <View key={note.id} style={{ flexDirection: 'row' }}>
                                                    <View style={{ width: Dimensions.get('window').width * 0.75, position: 'relative' }}>
                                                        {note.originalReference && note.originalReference !== note.verseReference && (
                                                            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginBottom: 4, fontStyle: 'italic' }}>
                                                                {note.originalReference}
                                                            </Text>
                                                        )}
                                                        <Text style={{ color: theme.colors.onBackground, fontSize: 14, lineHeight: 20 }}>
                                                            {note.text}
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                                            {note.createdDate && (
                                                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
                                                                    {formatDate(note.createdDate)}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        {note.username === user?.username && (
                                                            <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 }}>
                                                                <TouchableOpacity
                                                                    onPress={() => handleEditNote(note)}
                                                                    disabled={isDeletingNote || isUpdatingNote}
                                                                    style={{ padding: 4 }}
                                                                >
                                                                    <Ionicons name="pencil" size={16} color={theme.colors.onBackground} />
                                                                </TouchableOpacity>
                                                                <TouchableOpacity
                                                                    onPress={() => handleDeleteNote(note)}
                                                                    disabled={isDeletingNote || isUpdatingNote}
                                                                    style={{ padding: 4 }}
                                                                >
                                                                    {isDeletingNote ? (
                                                                        <ActivityIndicator size="small" color={theme.colors.error} />
                                                                    ) : (
                                                                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                                                    )}
                                                                </TouchableOpacity>
                                                            </View>
                                                        )}
                                                    </View>
                                                    {index < privateNotes.length - 1 && (
                                                        <View style={{ width: 1, backgroundColor: theme.colors.outline, marginHorizontal: 6 }} />
                                                    )}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    )
                                )}
                            </View>
                            )}

                            <View style={{ marginTop: 20, marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text
                                        style={{
                                            fontFamily: 'Noto Serif bold',
                                            fontSize: 20,
                                            color: theme.colors.onBackground,
                                        }}
                                    >
                                        Public Notes
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            onClose();
                                            router.push({
                                                pathname: '/notes/chapter/[bookName]/[chapter]',
                                                params: { bookName: encodeURIComponent(bookName), chapter: chapter.toString(), type: 'public' }
                                            } as any);
                                        }}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                        }}
                                    >
                                        <Text style={{
                                            color: theme.colors.onBackground,
                                            fontSize: 14,
                                            fontWeight: '600',
                                            fontFamily: 'Inter'
                                        }}>
                                            See All
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {verses.length > 1 ? (
                                    // Multiple verses - combine all notes into one horizontal scroll section
                                    isLoadingAnyVerseNotes ? (
                                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                                    ) : allPublicNotes.length === 0 ? (
                                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, fontStyle: 'italic' }}>
                                            No public notes
                                        </Text>
                                    ) : (
                                        <ScrollView 
                                            horizontal 
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ paddingRight: 20 }}
                                            snapToInterval={noteCardWidth + 13}
                                            snapToAlignment="start"
                                            decelerationRate="fast"
                                            pagingEnabled={false}
                                        >
                                            {allPublicNotes.map((note, noteIndex) => {
                                                const noteIsMultiVerse = isMultiVerseReference(note.verseReference || '');
                                                const handleLikeToggle = async () => {
                                                    if (!user?.username) return;
                                                    try {
                                                        const result = note.userLiked
                                                            ? await unlikeNote(note.id, user.username)
                                                            : await likeNote(note.id, user.username);
                                                        
                                                        // Update the note in the verseNotes map
                                                        setVerseNotes(prev => {
                                                            const newMap = new Map(prev);
                                                            // Find which verse this note belongs to
                                                            verses.forEach(verse => {
                                                                const verseRef = verse.verse_reference;
                                                                if (verseRef) {
                                                                    const current = newMap.get(verseRef);
                                                                    if (current?.public.some(n => n.id === note.id)) {
                                                                        const updatedPublic = current.public.map(n => 
                                                                            n.id === note.id 
                                                                                ? { ...n, likeCount: result.likeCount, userLiked: result.liked }
                                                                                : n
                                                                        );
                                                                        newMap.set(verseRef, { ...current, public: updatedPublic });
                                                                    }
                                                                }
                                                            });
                                                            return newMap;
                                                        });
                                                    } catch (error) {
                                                        console.error('Error toggling like:', error);
                                                    }
                                                };

                                                return (
                                                    <View key={note.id} style={{ flexDirection: 'row' }}>
                                                        <View style={{ width: Dimensions.get('window').width * 0.75, position: 'relative' }}>
                                                            {/* Show verse reference when multiple verses are selected, but hide if note is for multiple verses */}
                                                            {!noteIsMultiVerse && (
                                                                <Text style={{ 
                                                                    color: theme.colors.onBackground, 
                                                                    fontSize: 12, 
                                                                    fontWeight: '600', 
                                                                    marginBottom: 4,
                                                                    fontFamily: 'Inter'
                                                                }}>
                                                                    {note.verseReference}
                                                                </Text>
                                                            )}
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                                <Text style={{ color: theme.colors.onBackground, fontSize: 12, fontWeight: '600' }}>
                                                                    {note.username}
                                                                </Text>
                                                                <TouchableOpacity
                                                                    onPress={handleLikeToggle}
                                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                                                    disabled={!user?.username}
                                                                >
                                                                    <Ionicons 
                                                                        name={note.userLiked ? "heart" : "heart-outline"} 
                                                                        size={18} 
                                                                        color={note.userLiked ? theme.colors.error : theme.colors.onSurfaceVariant} 
                                                                    />
                                                                    {note.likeCount !== undefined && note.likeCount > 0 && (
                                                                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                                                                            {note.likeCount}
                                                                        </Text>
                                                                    )}
                                                                </TouchableOpacity>
                                                            </View>
                                                            {note.createdDate && (
                                                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginBottom: 4 }}>
                                                                    {formatDate(note.createdDate)}
                                                                </Text>
                                                            )}
                                                            {note.originalReference && note.originalReference !== note.verseReference && (
                                                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginBottom: 4, fontStyle: 'italic' }}>
                                                                    {note.originalReference}
                                                                </Text>
                                                            )}
                                                            <Text style={{ color: theme.colors.onBackground, fontSize: 14, lineHeight: 20 }}>
                                                                {note.text}
                                                            </Text>
                                                            {note.username === user?.username && (
                                                                <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 }}>
                                                                    <TouchableOpacity
                                                                        onPress={() => handleEditNote(note)}
                                                                        disabled={isDeletingNote || isUpdatingNote}
                                                                        style={{ padding: 4 }}
                                                                    >
                                                                        <Ionicons name="pencil" size={16} color={theme.colors.onBackground} />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        onPress={() => handleDeleteNote(note)}
                                                                        disabled={isDeletingNote || isUpdatingNote}
                                                                        style={{ padding: 4 }}
                                                                    >
                                                                        {isDeletingNote ? (
                                                                            <ActivityIndicator size="small" color={theme.colors.error} />
                                                                        ) : (
                                                                            <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                                                        )}
                                                                    </TouchableOpacity>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {noteIndex < allPublicNotes.length - 1 && (
                                                            <View style={{ width: 1, backgroundColor: theme.colors.outline, marginHorizontal: 6 }} />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>
                                    )
                                ) : (
                                    // Single verse - existing behavior
                                    loadingNotes ? (
                                        <ActivityIndicator size="small" color={theme.colors.onBackground} />
                                    ) : notes.length === 0 ? (
                                        <Text style={{ color: theme.colors.onBackground, fontSize: 14, fontStyle: 'italic' }}>
                                            No public notes
                                        </Text>
                                    ) : (
                                        <ScrollView 
                                            horizontal 
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ paddingRight: 20 }}
                                            snapToInterval={noteCardWidth + 13}
                                            snapToAlignment="start"
                                            decelerationRate="fast"
                                            pagingEnabled={false}
                                        >
                                            {notes.map((note, index) => {
                                                const handleLikeToggle = async () => {
                                                    if (!user?.username) return;
                                                    try {
                                                        const result = note.userLiked
                                                            ? await unlikeNote(note.id, user.username)
                                                            : await likeNote(note.id, user.username);
                                                        
                                                        // Update the note in the list
                                                        setNotes(prevNotes => 
                                                            prevNotes.map(n => 
                                                                n.id === note.id 
                                                                    ? { ...n, likeCount: result.likeCount, userLiked: result.liked }
                                                                    : n
                                                            )
                                                        );
                                                    } catch (error) {
                                                        console.error('Error toggling like:', error);
                                                    }
                                                };

                                                return (
                                                    <View key={note.id} style={{ flexDirection: 'row' }}>
                                                        <View style={{ width: Dimensions.get('window').width * 0.75, position: 'relative' }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                                <Text style={{ color: theme.colors.onBackground, fontSize: 12, fontWeight: '600' }}>
                                                                    {note.username}
                                                                </Text>
                                                                <TouchableOpacity
                                                                    onPress={handleLikeToggle}
                                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                                                    disabled={!user?.username}
                                                                >
                                                                    <Ionicons 
                                                                        name={note.userLiked ? "heart" : "heart-outline"} 
                                                                        size={18} 
                                                                        color={note.userLiked ? theme.colors.error : theme.colors.onSurfaceVariant} 
                                                                    />
                                                                    {note.likeCount !== undefined && note.likeCount > 0 && (
                                                                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                                                                            {note.likeCount}
                                                                        </Text>
                                                                    )}
                                                                </TouchableOpacity>
                                                            </View>
                                                            {note.createdDate && (
                                                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginBottom: 4 }}>
                                                                    {formatDate(note.createdDate)}
                                                                </Text>
                                                            )}
                                                            {note.originalReference && note.originalReference !== note.verseReference && (
                                                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginBottom: 4, fontStyle: 'italic' }}>
                                                                    {note.originalReference}
                                                                </Text>
                                                            )}
                                                            <Text style={{ color: theme.colors.onBackground, fontSize: 14, lineHeight: 20 }}>
                                                                {note.text}
                                                            </Text>
                                                            {note.username === user?.username && (
                                                                <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 }}>
                                                                    <TouchableOpacity
                                                                        onPress={() => handleEditNote(note)}
                                                                        disabled={isDeletingNote || isUpdatingNote}
                                                                        style={{ padding: 4 }}
                                                                    >
                                                                        <Ionicons name="pencil" size={16} color={theme.colors.onBackground} />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        onPress={() => handleDeleteNote(note)}
                                                                        disabled={isDeletingNote || isUpdatingNote}
                                                                        style={{ padding: 4 }}
                                                                    >
                                                                        {isDeletingNote ? (
                                                                            <ActivityIndicator size="small" color={theme.colors.error} />
                                                                        ) : (
                                                                            <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                                                        )}
                                                                    </TouchableOpacity>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {index < notes.length - 1 && (
                                                            <View style={{ width: 1, backgroundColor: theme.colors.outline, marginHorizontal: 6 }} />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>
                                    )
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
                            {editingNote ? 'Edit Note' : 'Add Note'}
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
                                Make this note visible to all users
                            </Text>
                        </TouchableOpacity>

                        <Text style={{
                            color: theme.colors.onSurfaceVariant,
                            fontSize: 11,
                            marginBottom: 16,
                        }}>
                            Notes are encrypted before they are stored
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
                                    setEditingNote(null);
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
                                disabled={!noteText.trim() || isCreatingNote || isUpdatingNote}
                            >
                                {(isCreatingNote || isUpdatingNote) ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{
                                        ...styles.tinyText,
                                        color: '#fff',
                                    }}>
                                        {editingNote ? 'Update' : 'Create'}
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

