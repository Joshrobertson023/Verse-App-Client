import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Searchbar, Text } from 'react-native-paper';
import { getVerseSearchResult } from '../db';
import { SearchData, useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function AddPassage() {
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

    const handleSearch = async () => {
        if (searchQuery.length === 0) {
            setSearchLoading(false);
            setButtonLoading(false);
            setLoading(false);
            return;
        }
        
        const results = await getVerseSearchResult(searchQuery);
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

    const clearSearchResults = () => {
        setPassageSearchResults(undefined);
        setShowAddPassage(false);
    }
    
    const handleAddPassage = () => {
        if (passageSearchResults === undefined) return;
        const userVerse: UserVerse = {
            username: user.username,
            readableReference: passageSearchResults ? passageSearchResults.readable_Reference : 'Undefined',
            verses: passageSearchResults ? passageSearchResults.verses : [],
        }
        addUserVerseToCollection(userVerse);
    }

    return (
        <ScrollView style={{marginTop: 10}}>
            <Searchbar
                placeholder="Search by reference or keywords"
                onChangeText={setSearchQuery}
                value={searchQuery}
                loading={searchLoading}
                onClearIconPress={clearSearchResults}
                onSubmitEditing={() => {
                    setSearchLoading(true);
                    handleSearch();
                }}
                style={{marginBottom: 10, backgroundColor: theme.colors.surface2}}
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
                passageSearchResults.verses.map((verse, i) => (
                    <View key={i} style={{paddingTop: 10}}>
                        <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 300}}>
                            {verse.verse_reference}
                        </Text>
                        <Text style={{...styles.text, fontFamily: 'Noto Serif', alignContent: 'flex-start', marginTop: -10}}>
                            {verse.text}
                        </Text>
                        <View style={{marginTop: -30, marginBottom: 20, flex: 1, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
                            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',  width: 20}}>
                                    <Ionicons name="people" size={20} color={theme.colors.onBackground}/>
                                    <Text style={{...styles.text, fontFamily: 'Inter', margin: 0, padding: 0, fontSize: 12, marginBottom: 0, marginLeft: 5}}>
                                            {verse.verse_reference.includes('Invalid') 
                                            || verse.verse_reference.includes('spelling') 
                                            ? null : (verse.users_Saved_Verse + " saves")}
                                    </Text>
                            </View>
                            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',  width: 20}}>
                                <Ionicons name="checkmark-done" size={20} color={theme.colors.onBackground} />
                                <Text style={{...styles.text, fontFamily: 'Inter', margin: 0, padding: 0, fontSize: 12, marginBottom: 0, marginLeft: 5}}>
                                    {verse.verse_reference.includes('Invalid') 
                                    || verse.verse_reference.includes('spelling') 
                                    ? null : (verse.users_Memorized + " memorized")}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) )
                ) : <View></View>}

                <View style={{height: 100}}></View>

        </ScrollView>
    )
}