import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Portal, Snackbar } from 'react-native-paper';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { addUserVersesToNewCollection, updateCollectionDB } from '../db';
import { Collection, UserVerse, Verse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import ShareVerseSheet from './shareVerseSheet';

const { height } = Dimensions.get('window');

interface VerseSheetProps {
    verse: Verse | null;
    verseIndex: number;
    visible: boolean;
    onClose: () => void;
    bookName: string;
    chapter: number;
}

export default function VerseSheet({ verse, verseIndex, visible, onClose, bookName, chapter }: VerseSheetProps) {
    const styles = useStyles();
    const theme = useAppTheme();
    const user = useAppStore((state) => state.user);
    const collections = useAppStore((state) => state.collections);
    const setCollections = useAppStore((state) => state.setCollections);

    const [showCollectionPicker, setShowCollectionPicker] = useState(false);
    const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
    const [pickedCollection, setPickedCollection] = useState<Collection | undefined>(undefined);
    const [isAddingToCollection, setIsAddingToCollection] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [verseToShare, setVerseToShare] = useState<Verse | null>(null);

    // Get the verse number, falling back to index + 1 if verse_Number is null
    const verseNumber = verse?.verse_Number ? (typeof verse.verse_Number === 'string' ? parseInt(verse.verse_Number) : verse.verse_Number) : verseIndex + 1;
    
    // Create proper verse reference in the format "Book Chapter:Verse"
    const verseReference = verse ? `${bookName} ${chapter}:${verseNumber}` : '';

    const sheetHeight = height * 0.65;
    const closedPosition = height;
    const openPosition = height - sheetHeight;

    const translateY = useSharedValue(closedPosition);
    const startY = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            translateY.value = withSpring(openPosition, {
                stiffness: 900,
                damping: 110,
                mass: 2,
                overshootClamping: true,
                energyThreshold: 6e-9,
            });
        } else {
            translateY.value = closedPosition;
        }
    }, [visible]);

    const closeSheet = () => {
        translateY.value = withSpring(closedPosition, {
            stiffness: 900,
            damping: 110,
            mass: 2,
            overshootClamping: true,
            energyThreshold: 6e-9,
        }, (isFinished) => {
            'worklet';
            if (isFinished) {
                runOnJS(onClose)();
            }
        });
    };

    const panGesture = Gesture.Pan()
        .onStart(() => {
            'worklet';
            startY.value = translateY.value;
        })
        .onUpdate(e => {
            'worklet';
            const newPosition = startY.value + e.translationY;
            translateY.value = Math.max(openPosition, newPosition);
        })
        .onEnd(e => {
            'worklet';
            const SWIPE_DISTANCE_THRESHOLD = 150;
            const VELOCITY_THRESHOLD = 500;

            const isDraggedDownFar = translateY.value > openPosition + SWIPE_DISTANCE_THRESHOLD;
            const isFlickedDown = e.velocityY > VELOCITY_THRESHOLD;

            if (isDraggedDownFar || isFlickedDown) {
                translateY.value = withSpring(closedPosition, {
                    stiffness: 900,
                    damping: 110,
                    mass: 2,
                    overshootClamping: true,
                    energyThreshold: 6e-9,
                }, (isFinished) => {
                    'worklet';
                    if (isFinished) {
                        runOnJS(closeSheet)();
                    }
                });
            } else {
                translateY.value = withSpring(openPosition, {
                    stiffness: 900,
                    damping: 110,
                    mass: 2,
                    overshootClamping: true,
                    energyThreshold: 6e-9,
                });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => {
        const sheetProgress = (closedPosition - translateY.value) / sheetHeight;
        const opacity = Math.min(1, Math.max(0, sheetProgress)) * 0.5;
        return {
            opacity,
            pointerEvents: opacity > 0.001 ? 'auto' : 'none',
        };
    });

    const handleSaveVerse = () => {
        if (!verse) return;
        
        const readableRef = `${bookName} ${chapter}:${verseNumber}`;
        const formattedVerse: Verse = {
            ...verse,
            verse_reference: verse.verse_reference || readableRef,
            verse_Number: verse.verse_Number ?? verseNumber.toString(),
        };
        
        setSelectedVerse(formattedVerse);
        setPickedCollection(undefined);
        setShowCollectionPicker(true);
    };

    const handleAddToCollection = async () => {
        if (!pickedCollection || !selectedVerse || !user.username || isAddingToCollection) return;

        const readableRef = selectedVerse.verse_reference || `${bookName} ${chapter}:${verseNumber}`;
        
        // Check if verse already exists in collection
        const alreadyExists = pickedCollection.userVerses.some(
            uv => uv.readableReference === readableRef
        );

        if (alreadyExists) {
            setSnackbarMessage('This passage is already in the collection');
            setSnackbarVisible(true);
            setShowCollectionPicker(false);
            setSelectedVerse(null);
            setPickedCollection(undefined);
            return;
        }

        setIsAddingToCollection(true);

        const userVerse: UserVerse = {
            username: user.username,
            readableReference: readableRef,
            verses: [selectedVerse],
        };

        try {
            // Add user verse to collection
            await addUserVersesToNewCollection([userVerse], pickedCollection.collectionId!);
            
            // Update verseOrder
            const currentOrder = pickedCollection.verseOrder || '';
            const newOrder = currentOrder ? `${currentOrder}${readableRef},` : `${readableRef},`;
            
            // Update collection in the database
            const updatedCollection = {
                ...pickedCollection,
                userVerses: [...pickedCollection.userVerses, userVerse],
                verseOrder: newOrder,
            };
            await updateCollectionDB(updatedCollection);

            // Update store
            setCollections(collections.map(c => 
                c.collectionId === pickedCollection.collectionId ? updatedCollection : c
            ));

            setShowCollectionPicker(false);
            setSelectedVerse(null);
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

    const handleOpenCommentary = async () => {
        // Format book name for URL (e.g., "Song of Solomon" -> "Song-of-Solomon")
        const formattedBookName = bookName.replace(/\s+/g, '-');
        const url = `https://www.bibleref.com/${formattedBookName}/${chapter}/${formattedBookName}-${chapter}-${verseNumber}.html`;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            }
        } catch (error) {
            console.error('Error opening commentary:', error);
        }
    };

    if (!visible || !verse) return null;

    return (
        <Portal>
            <Animated.View
                style={[{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: theme.colors.onBackground,
                    zIndex: 9998,
                },
                backdropStyle]}
            >
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={0.5}
                    onPress={closeSheet}
                />
            </Animated.View>

            <Animated.View style={[{
                position: 'absolute',
                left: 0,
                right: 0,
                height: sheetHeight,
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingTop: 20,
                zIndex: 9999,
            }, animatedStyle]}>
                <GestureDetector gesture={panGesture}>
                    <View style={{ padding: 20, marginTop: -20, alignItems: 'center' }}>
                        <View style={{ width: 50, height: 4, borderRadius: 2, backgroundColor: theme.colors.onBackground }} />
                    </View>
                </GestureDetector>

                <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
                    {/* Verse Reference */}
                    <Text style={{
                        fontFamily: 'Noto Serif bold',
                        fontSize: 28,
                        color: theme.colors.onBackground,
                        marginBottom: 10,
                    }}>
                        {bookName} {chapter}:{verseNumber}
                    </Text>

                    {/* Verse Text */}
                    <Text style={{
                        fontFamily: 'Noto Serif',
                        fontSize: 18,
                        color: theme.colors.onBackground,
                        lineHeight: 28,
                        marginBottom: 20,
                    }}>
                        {verse.text}
                    </Text>

                    {/* Commentary Button */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: theme.colors.surface,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                            marginBottom: 25,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                        onPress={handleOpenCommentary}
                    >
                        <Text style={{
                            color: theme.colors.onBackground,
                            fontSize: 14,
                        }}>
                            Commentary on {bookName} {chapter}:{verseNumber}
                        </Text>
                        <Ionicons name="open-outline" size={20} color={theme.colors.onBackground} />
                    </TouchableOpacity>

                    {/* Metadata Section */}
                    <View style={{ marginBottom: 30 }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12,
                        }}>
                            <Ionicons name="people" size={18} color={theme.colors.onBackground} />
                            <Text style={{
                                color: theme.colors.onBackground,
                                fontSize: 14,
                                marginLeft: 10,
                            }}>
                                {verse.users_Saved_Verse || 0} {(verse.users_Saved_Verse || 0) === 1 ? 'save' : 'saves'}
                            </Text>
                        </View>

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                            <Ionicons name="checkmark-done" size={18} color={theme.colors.onBackground}/>
                            <Text style={{
                                color: theme.colors.onBackground,
                                fontSize: 14,
                                marginLeft: 10,
                            }}>
                                {verse.users_Memorized || 0} {(verse.users_Memorized || 0) === 1 ? 'memorized' : 'memorized'}
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', marginTop: 0, gap: 16, marginBottom: 20 }}>
                        <TouchableOpacity 
                            onPress={handleSaveVerse}
                            activeOpacity={0.1}
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Ionicons name="bookmark-outline" size={18} color={theme.colors.onBackground} />
                            <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center' }} 
                            activeOpacity={0.1} 
                            onPress={() => {
                                if (verse) {
                                    const readableRef = `${bookName} ${chapter}:${verseNumber}`;
                                    const formattedVerse: Verse = {
                                        ...verse,
                                        verse_reference: verse.verse_reference || readableRef,
                                        verse_Number: verse.verse_Number ?? verseNumber.toString(),
                                    };
                                    setVerseToShare(formattedVerse);
                                }
                            }}
                        >
                            <Ionicons name="share-social-outline" size={18} color={theme.colors.onBackground} />
                            <Text style={{ marginLeft: 4, color: theme.colors.onBackground }}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>

            {/* Collection Picker Modal */}
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

                        <ScrollView>
                            {(() => {
                                // Separate favorites and non-favorites, same logic as index.tsx
                                const favorites = collections.filter(col => col.favorites || col.title === 'Favorites');
                                const nonFavorites = collections.filter(col => !col.favorites && col.title !== 'Favorites');
                                
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
                                                onPress={() => setPickedCollection(collection)}
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
                                                onPress={() => setPickedCollection(collection)}
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

                            <TouchableOpacity
                                style={{
                                    backgroundColor: theme.colors.primary,
                                    paddingVertical: 12,
                                    paddingHorizontal: 24,
                                    borderRadius: 8,
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
                        </View>
                    </View>
                </View>
            </Modal>

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

            <ShareVerseSheet
                visible={!!verseToShare}
                verseReference={verseToShare?.verse_reference || null}
                onClose={() => setVerseToShare(null)}
                onShareSuccess={(friend) => { 
                    setVerseToShare(null); 
                    setSnackbarMessage(`Verse shared with ${friend}`); 
                    setSnackbarVisible(true); 
                }}
                onShareError={() => { 
                    setSnackbarMessage('Failed to share verse'); 
                    setSnackbarVisible(true); 
                }}
            />
        </Portal>
    );
}

