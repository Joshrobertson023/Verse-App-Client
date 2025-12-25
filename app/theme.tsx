import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useAppStore } from './store';

export default function useAppTheme() {
    const systemScheme = useColorScheme();
    const themePreference = useAppStore((state) => state.themePreference);
    const scheme = themePreference === 'system' ? (systemScheme || 'light') : themePreference;

    return scheme === 'dark' ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#f8f8f8ff',
          secondary: '#c14848ff',
          background: '#151515ff',
          surface: '#292929ff',
          surface2: '#3d3d3dff',
          onBackground: '#fff',
          backdrop: '#2a2a2aff',
          onPrimary: '#73675aff',
          gray: '#737373ff',
          onSurfaceVariant: '#fff',
          onSurface: '#fff',
          verseText: '#d3d3d3ff',
          verseHint: '#959595ff'
        }
    } : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#b93838ff',
          secondary: '#c14848ff',
          background: '#fff',
          surface: '#f5f5f5',
          surface2: '#cececeff',
          onBackground: '#000',
          backdrop: '#f5f5f5',
          onPrimary: '#603f1bff',
          gray: '#919191ff',
          onSurfaceVariant: '#000',
          onSurface: '#000',
          verseText: '#363636ff',
          verseHint: '#4d4a4aff'
          // add more overrides as needed
        }
    };
}