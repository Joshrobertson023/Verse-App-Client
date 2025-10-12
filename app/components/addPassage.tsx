import React from 'react';
import { Text, View } from 'react-native';
import getStyles from '../styles';
import useAppTheme from '../theme';

export default function AddPassage() {
    const styles = getStyles();
    const theme = useAppTheme();

    return (
        <View>
            <Text>Working</Text>
        </View>
    )
}