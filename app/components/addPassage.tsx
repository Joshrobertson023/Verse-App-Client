import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import { getVerseSearchResult } from '../db';
import { Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function AddPassage() {
    const styles = useStyles();
    const theme = useAppTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [keywordSearchResults, setKeywordSearchResults] = useState<Verse[] | undefined>();
    const [passageSearchResults, setPassageSearchResults] = useState<Verse[] | undefined>();
    const [buttonLoading, setButtonLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    const handleSearch = async () => {
        alert('searching for ' + searchQuery)
        const results = await getVerseSearchResult(searchQuery);
        setPassageSearchResults(results);
    }

    return (
        <View style={{paddingTop: 20}}>
            <Searchbar
                placeholder="Search by reference or keywords"
                onChangeText={setSearchQuery}
                value={searchQuery}
                loading={searchLoading}
                onSubmitEditing={() => {
                    setSearchLoading(true);
                    handleSearch();
                }}
                style={{marginBottom: 10, backgroundColor: theme.colors.backdrop}}
                />
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
            </TouchableOpacity>

            {passageSearchResults && passageSearchResults.length > 0 && (
                passageSearchResults.map((v, i) => (
                    <Text key={i}>{v.reference}</Text>
                ))
                )}

        </View>
    )
}