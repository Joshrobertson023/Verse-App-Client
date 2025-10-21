import React from 'react';
import { Text } from 'react-native';
import useAppTheme from '../theme';

const Logo = () => {
    const theme = useAppTheme();

    return (
        <Text style={{ fontSize: 42, color: theme.colors.onBackground,
            textAlign: 'center', marginBottom: 0, width: '100%', top: 50, position: 'relative', zIndex: 1, fontFamily: 'Noto Serif bold'
         }}>VerseApp</Text>
    )
}

export default Logo;