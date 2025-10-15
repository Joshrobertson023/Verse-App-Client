import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import colors from './colors';

export default function useAppTheme() {
    const scheme = useColorScheme();
    return scheme === 'dark' ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#3769b4ff',
          secondary: '#3769b4ff',
          background: '#000000ff',
          surface: '#292929ff',
          surface2: '#3d3d3dff',
          onBackground: colors.primaryWhite,
          backdrop: '#2a2a2aff'
        }
    } : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#2E4B95',
          secondary: '#3f8ee8ff',
          background: '#fff',
          surface: '#f5f5f5',
          surface2: '#cececeff',
          onBackground: '#000',
          backdrop: '#f5f5f5'
          // add more overrides as needed
        }
    };
}