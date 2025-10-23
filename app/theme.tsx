import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import colors from './colors';

export default function useAppTheme() {
    const scheme = useColorScheme();
    return scheme === 'dark' ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#b9641aff',
          secondary: '#b47837ff',
          background: '#181818',
          surface: '#292929ff',
          surface2: '#3d3d3dff',
          onBackground: colors.primaryWhite,
          backdrop: '#2a2a2aff',
          onPrimary: '#603f1bff'
        }
    } : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#b9641aff',
          secondary: '#b47837ff',
          background: '#fff',
          surface: '#f5f5f5',
          surface2: '#cececeff',
          onBackground: '#000',
          backdrop: '#f5f5f5',
          onPrimary: '#603f1bff'
          // add more overrides as needed
        }
    };
}