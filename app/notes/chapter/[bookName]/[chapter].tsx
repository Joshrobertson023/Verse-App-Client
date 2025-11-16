import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { formatDate } from '../../../dateUtils';
import { getAllNotesByChapter, likeNote, unlikeNote, VerseNote } from '../../../db';
import { useAppStore } from '../../../store';
import useAppTheme from '../../../theme';

export default function ChapterNotesScreen() {
    const theme = useAppTheme();
    const params = useLocalSearchParams<{ bookName: string; chapter: string; type: string }>();
    const user = useAppStore((state) => state.user);
    
    const bookName = params.bookName ? decodeURIComponent(params.bookName) : '';
    const chapter = parseInt(params.chapter || '1', 10);
    const noteType = params.type || 'public'; // 'private' or 'public'
    
    const [notes, setNotes] = useState<VerseNote[]>([]);
    const [loading, setLoading] = useState(true);

    // Helper function to check if a verse reference contains multiple verses (e.g., "Genesis 1:1-2")
    const isMultiVerseReference = (ref: string): boolean => {
        if (!ref) return false;
        // Check if reference contains a dash followed by a number (e.g., "1:1-2" or "1:1-3:5")
        return /:\d+-\d+/.test(ref) || /-\d+/.test(ref);
    };

    // Load all notes for the chapter
    const loadChapterNotes = useCallback(async () => {
        if (!bookName || !chapter) return;
        
        setLoading(true);
        try {
            const allNotes = await getAllNotesByChapter(
                bookName, 
                chapter, 
                noteType as 'private' | 'public',
                noteType === 'private' ? user?.username : undefined,
                user?.username
            );
            
            setNotes(allNotes);
        } catch (error) {
            console.error('Error loading chapter notes:', error);
        } finally {
            setLoading(false);
        }
    }, [bookName, chapter, noteType, user?.username]);

    useEffect(() => {
        loadChapterNotes();
    }, [loadChapterNotes]);

    const handleLikeToggle = async (note: VerseNote) => {
        if (!user?.username || !note.id) return;
        try {
            const result = note.userLiked
                ? await unlikeNote(note.id, user.username)
                : await likeNote(note.id, user.username);
            
            // Update the note in the local state
            setNotes(prev => prev.map(n => 
                n.id === note.id 
                    ? { ...n, likeCount: result.likeCount, userLiked: result.liked }
                    : n
            ));
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: `${noteType === 'private' ? 'Private' : 'Public'} Notes - ${bookName} ${chapter}`,
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: theme.colors.background,
                    },
                    headerTintColor: theme.colors.onBackground,
                    headerShadowVisible: false,
                }}
            />
            <ScrollView 
                style={{ flex: 1, backgroundColor: theme.colors.background }}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
                ) : notes.length === 0 ? (
                    <Text style={{ 
                        color: theme.colors.onSurfaceVariant, 
                        fontSize: 16, 
                        fontStyle: 'italic',
                        textAlign: 'center',
                        marginTop: 40
                    }}>
                        No {noteType} notes found for this chapter.
                    </Text>
                ) : (
                    notes.map((note, index) => {
                        const noteIsMultiVerse = isMultiVerseReference(note.verseReference || '');
                        return (
                            <View key={note.id || index}>
                                <View style={{ paddingVertical: 16 }}>
                                    {/* Show verse reference if not a multi-verse note */}
                                    {!noteIsMultiVerse && note.verseReference && (
                                        <Text style={{ 
                                            color: theme.colors.onBackground, 
                                            fontSize: 14, 
                                            fontWeight: '600', 
                                            marginBottom: 8,
                                            fontFamily: 'Inter'
                                        }}>
                                            {note.verseReference}
                                        </Text>
                                    )}
                                    
                                    {/* Show original reference if different from verse reference */}
                                    {note.originalReference && note.originalReference !== note.verseReference && (
                                        <Text style={{ 
                                            color: theme.colors.onSurfaceVariant, 
                                            fontSize: 12, 
                                            marginBottom: 8, 
                                            fontStyle: 'italic',
                                            fontFamily: 'Inter'
                                        }}>
                                            {note.originalReference}
                                        </Text>
                                    )}
                                    
                                    {/* Public notes: show username and like button */}
                                    {noteType === 'public' && (
                                        <View style={{ 
                                            flexDirection: 'row', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            marginBottom: 8 
                                        }}>
                                            <Text style={{ 
                                                color: theme.colors.onBackground, 
                                                fontSize: 14, 
                                                fontWeight: '600',
                                                fontFamily: 'Inter'
                                            }}>
                                                {note.username}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => handleLikeToggle(note)}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                                disabled={!user?.username}
                                            >
                                                <Ionicons 
                                                    name={note.userLiked ? "heart" : "heart-outline"} 
                                                    size={20} 
                                                    color={note.userLiked ? theme.colors.error : theme.colors.onSurfaceVariant} 
                                                />
                                                {note.likeCount !== undefined && note.likeCount > 0 && (
                                                    <Text style={{ 
                                                        color: theme.colors.onSurfaceVariant, 
                                                        fontSize: 14,
                                                        fontFamily: 'Inter'
                                                    }}>
                                                        {note.likeCount}
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    
                                    {/* Note text */}
                                    <Text style={{ 
                                        color: theme.colors.onBackground, 
                                        fontSize: 15, 
                                        lineHeight: 22,
                                        fontFamily: 'Inter',
                                        marginBottom: 8
                                    }}>
                                        {note.text}
                                    </Text>
                                    
                                    {/* Created date */}
                                    {note.createdDate && (
                                        <Text style={{ 
                                            color: theme.colors.onSurfaceVariant, 
                                            fontSize: 12,
                                            fontFamily: 'Inter'
                                        }}>
                                            {formatDate(note.createdDate)}
                                        </Text>
                                    )}
                                </View>
                                {index < notes.length - 1 && (
                                    <View style={{ 
                                        height: 1, 
                                        backgroundColor: theme.colors.outline,
                                        marginVertical: 0
                                    }} />
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </>
    );
}

