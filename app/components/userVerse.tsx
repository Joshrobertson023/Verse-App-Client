import React from 'react';
import { View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface userVerseProps {
    userVerse: UserVerse;
}


export default function UserVerseCard({userVerse}: userVerseProps) {
    const styles = useStyles();
    const theme = useAppTheme();

    return (
        <View style={{width: '100%'}}>
            <Surface style={{width: '100%', padding: 20, borderRadius: 3}} elevation={4}>
                <Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>{userVerse.readableReference}</Text>
                {userVerse.verses.map((verse) => (
                    <View key={verse.verse_reference} style={{}}>
                        <View>
                            <Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 18}}>{verse.verseNumber}: {verse.text}</Text>
                        </View>
                    </View>
                ))}
            </Surface>
        </View>
    )
}