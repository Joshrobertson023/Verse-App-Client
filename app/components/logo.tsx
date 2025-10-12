import React from 'react';
import { Text } from 'react-native';
import useAppTheme from '../theme';

const Logo = () => {
    const theme = useAppTheme();

    return (
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: theme.colors.onBackground,
            textAlign: 'center', marginBottom: 0, width: '100%', top: 50, position: 'relative', zIndex: 1
         }}>Logo Goes Here</Text>
    )
}

export default Logo;