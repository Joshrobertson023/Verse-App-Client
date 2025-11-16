import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Searchbar, Text } from 'react-native-paper';
import { getVerseSearchResult } from '../db';
import { SearchData, useAppStore, UserVerse, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface AddPassageProps {
    onAddPassage: () => void;
    onClickPlus: (verse: Verse) => void;
    onAddPassageVerses?: (userVerse: UserVerse) => void; // Optional callback for adding passages with multiple verses when editing
}

export default function AddPassage({onAddPassage, onClickPlus, onAddPassageVerses}: AddPassageProps) {
    const styles = useStyles();
    const theme = useAppTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [keywordSearchResults, setKeywordSearchResults] = useState<SearchData | undefined>();
    const [passageSearchResults, setPassageSearchResults] = useState<SearchData | undefined>();
    const [buttonLoading, setButtonLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showAddPassage, setShowAddPassage] = useState(false);
    const user = useAppStore((state) => state.user);
    const addUserVerseToCollection = useAppStore((state) => state.addUserVerseToCollection);
    const newCollection = useAppStore((state) => state.newCollection);
    const editingCollection = useAppStore((state) => state.editingCollection);
    const verseSaveAdjustments = useAppStore((state) => state.verseSaveAdjustments);
    const [errorSearching, setErrorSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSearch = async () => {
        if (searchQuery.length === 0) {
            setSearchLoading(false);
            setButtonLoading(false);
            setLoading(false);
            return;
        }
        
        const results = await getVerseSearchResult(searchQuery);
        if (results.verses.at(0)?.verse_reference.includes('missing expression')) {
            setErrorSearching(true);
            setErrorMsg('Nothing came back from that search. Please check your spelling and try again.');
        }
        else if (results.verses.at(0)?.verse_reference.includes('Not a valid verse')) {
            setErrorSearching(true);
            setErrorMsg('That is not a valid verse number. Please try again.');
        }
        else if (results.verses.at(0)?.verse_reference.includes('Error getting chapter')) {
            setErrorSearching(true);
            setErrorMsg('That is not a valid chapter number. Please try again.')
        }
        else
            setErrorSearching(false);
        setPassageSearchResults(results); 
        
        if (results?.searched_By_Passage === true) {
            setShowAddPassage(true);
        } else {
            setShowAddPassage(false);
        }
        
        setLoading(false);
        setButtonLoading(false);
        setSearchLoading(false);
    }

    const checkClearedInput = (value: string) => {
        if (value.trim().length === 0)
            clearSearchResults();
    }

    const clearSearchResults = () => {
        setPassageSearchResults(undefined);
        setShowAddPassage(false);
    }
    
    const handleAddPassage = () => {
        if (passageSearchResults === undefined) return;
        
        // Check if we're editing a collection - if so, use the appropriate callback
        if (editingCollection) {
            if (passageSearchResults.verses && passageSearchResults.verses.length > 0) {
                // Create a UserVerse with all verses from the passage
                const userVerse: UserVerse = {
                    username: user.username,
                    readableReference: passageSearchResults.readable_Reference || 'Undefined',
                    verses: passageSearchResults.verses,
                };
                
                // If onAddPassageVerses is provided (for editing), use it to add the full passage
                if (onAddPassageVerses) {
                    onAddPassageVerses(userVerse);
                    onAddPassage();
                } else {
                    // Fallback: use onClickPlus with first verse (for single verses)
                    const firstVerse = passageSearchResults.verses[0];
                    onClickPlus(firstVerse);
                    onAddPassage();
                }
            }
            return;
        }
        
        // When creating a new collection, use the store's addUserVerseToCollection
        const userVerse: UserVerse = {
            username: user.username,
            readableReference: passageSearchResults ? passageSearchResults.readable_Reference : 'Undefined',
            verses: passageSearchResults ? passageSearchResults.verses : [],
        }
        if (newCollection.userVerses.find(r => r.readableReference === userVerse.readableReference)) {
            return;
        }
        console.log('userVerse being added:', JSON.stringify(userVerse, null, 2));
        addUserVerseToCollection(userVerse);
        onAddPassage();
    }

    return (
        <ScrollView style={{paddingHorizontal: 20, paddingTop: 20}}>
            <Searchbar
                placeholder="Search by reference or keywords"
                onChangeText={(value) => {
                    setSearchQuery(value);
                    checkClearedInput(value);
                }}
                value={searchQuery}
                loading={searchLoading}
                onClearIconPress={clearSearchResults}
                onSubmitEditing={() => {
                    setSearchLoading(true);
                    handleSearch();
                }}
                style={{marginBottom: 10, backgroundColor: theme.colors.surface, borderColor: theme.colors.surface2, borderWidth: 1.5}}
                />

            {showAddPassage ? 
            <TouchableOpacity style={styles.button_filled} onPress={handleAddPassage}>
                <Text style={{...styles.buttonText_filled, fontWeight: 900}}>Add {passageSearchResults?.readable_Reference}</Text>
            </TouchableOpacity>
            :
            <TouchableOpacity style={styles.button_outlined} onPress={() => {
                setButtonLoading(true);
                handleSearch();
            }}>
                    {buttonLoading ? (
                        <Text style={styles.buttonText_filled}>
                            <ActivityIndicator animating={true} color={theme.colors.onBackground} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_outlined}>Search</Text>
                    )}
            </TouchableOpacity>}

            
            {passageSearchResults && passageSearchResults.verses.length > 0 ? (
                passageSearchResults.verses.map((verse, i) => {
                    const savedAdjustment = verseSaveAdjustments[verse.verse_reference] ?? 0;
                    const savedCount = (verse.users_Saved_Verse ?? 0) + savedAdjustment;
                    const savedLabel = savedCount === 1 ? 'save' : 'saves';
                    const memorizedCount = verse.users_Memorized ?? 0;
                    return (
                    passageSearchResults.searched_By_Passage === true ?
                    <View key={i} style={{paddingTop: 10}}>
                        <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 300, marginBottom: 10}}>
                                {errorSearching ? errorMsg : verse.verse_reference}
                        </Text>
                        <Text style={{...styles.text, fontFamily: 'Noto Serif', alignContent: 'flex-start'}}>
                            {verse.verse_Number ? verse.verse_Number + ":" : undefined} {verse.text}
                        </Text>
                        <View style={{marginBottom: 20, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
                            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',  width: 20}}>
                                {verse.verse_Number ? <Ionicons name="people" size={20} color={theme.colors.onBackground} /> : null}
                                    <Text style={{...styles.text, fontFamily: 'Inter', margin: 0, padding: 0, fontSize: 12, marginBottom: 0, marginLeft: 5}}>
                                                {verse.verse_Number ? (`${savedCount} ${savedLabel}`) : null}
                                    </Text>
                            </View>
                            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',  width: 20}}>
                                {verse.verse_Number ? <Ionicons name="checkmark-done" size={20} color={theme.colors.onBackground} /> : null}
                                <Text style={{...styles.text, fontFamily: 'Inter', margin: 0, padding: 0, fontSize: 12, marginBottom: 0, marginLeft: 5}}>
                                        {verse.verse_Number ? (`${memorizedCount} memorized`) : null}
                                </Text>
                            </View>
                        </View>
                    </View>
                    :
                     <View key={i} style={{paddingTop: 10, flex: 1}}>
                            <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 300, marginBottom: 10}}>
                                {errorSearching ? errorMsg : verse.verse_reference}
                            </Text>

                        <View style={{flexDirection: 'row', alignItems: 'start'}}>
                            <View style={{width: '85%'}}>
                                <Text style={{...styles.text, fontFamily: 'Noto Serif', alignContent: 'flex-start'}}>
                            {errorSearching ? null : verse.text}
                                </Text>
                            </View>
                            <View style={{width: '15%', alignItems: 'center', justifyContent: 'center'}}>
                                {errorSearching ? null 
                                : <TouchableOpacity style={{...styles.button_filled, borderRadius: 30, width: 40, height: 40}} onPress={() => {onClickPlus(verse); }}>
                                    <Ionicons name="add" size={28}/>
                                </TouchableOpacity>}
                            </View>
                        </View>

                            <View style={{marginBottom: 20, flexDirection: 'row', justifyContent: 'flex-start'}}>
                                <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
                                {errorSearching ? null : <Ionicons name="people" size={20} color={theme.colors.onBackground} />}
                                        <Text style={{...styles.text, fontFamily: 'Inter', margin: 0, padding: 0, fontSize: 12, marginBottom: 0, marginLeft: 5}}>
                                                {errorSearching ? null :
                                                 (`${savedCount} ${savedLabel}`)}
                                        </Text>
                                </View>
                                <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
                                {errorSearching ? null : <Ionicons name="checkmark-done" size={20} color={theme.colors.onBackground} />}
                                    <Text style={{...styles.text, fontFamily: 'Inter', margin: 0, padding: 0, fontSize: 12, marginBottom: 0, marginLeft: 5}}>
                                        {errorSearching ? null :
                                        (`${memorizedCount} memorized`)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                ) })
                ) : <View></View>}

        </ScrollView>
    )
}