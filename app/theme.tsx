import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import colors from './colors';

export default function useAppTheme() {
    const scheme = useColorScheme();
    return scheme === 'dark' ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#3091ffff',
          secondary: '#3f8ee8ff',
          background: '#111',
          surface: '#424242ff',
          onBackground: colors.primaryWhite,
          backdrop: '#6a6a6aff'
        }
    } : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#1565C0',
          secondary: '#3f8ee8ff',
          background: '#fff',
          surface: '#f5f5f5',
          onBackground: '#000',
          backdrop: '#f5f5f5'
          // add more overrides as needed
        }
    };
}