import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import colors from './colors';

export default function useAppTheme() {
    const scheme = useColorScheme();
    return scheme === 'dark' ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: colors.primaryWhite,
          background: '#111',
          surface: '#222',
          onBackground: colors.primaryWhite,
        }
    } : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#161616',
          background: '#fff',
          surface: '#f5f5f5',
          onBackground: '#000',
          // add more overrides as needed
        }
    };
}