import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function AddPassage() {
    const styles = useStyles();
    const theme = useAppTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        alert('Searching for ' + searchQuery);
    }

    return (
        <View style={{paddingTop: 20}}>
            <Searchbar
                placeholder="Search by reference or keywords"
                onChangeText={setSearchQuery}
                value={searchQuery}
                loading={loading}
                onSubmitEditing={handleSearch}
                style={{marginBottom: 10}}
                />
            <TouchableOpacity style={styles.button_outlined} onPress={handleSearch}>
                <Text style={styles.buttonText_outlined}>Search</Text>
            </TouchableOpacity>
        </View>
    )
}