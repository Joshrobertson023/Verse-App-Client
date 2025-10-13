import { StyleSheet } from 'react-native';
import colors from './colors';
import useAppTheme from './theme';


export default function useStyles() {  
  const theme = useAppTheme();
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    scrollContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    collectionsContainer: {
      flex: 1,
      width: '100%',
    },
    collectionItem: {
      height: 90,
      minHeight: 50,
      marginTop: 25,
      borderRadius: 6,
      display: 'flex',
      paddingLeft: 15,
      padding: 10,
      justifyContent: 'flex-start',
      width: '100%',
      marginBottom: 0,
      boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.2)',
      backgroundColor: theme.colors.surface,
    },
    text: {
      color: theme.colors.onBackground,
      fontSize: 20,
      marginBottom: 16,
    },
    tinyText: {
      color: theme.colors.onBackground,
      fontSize: 16,
    },
    inputText: {
      color: theme.colors.onBackground,
      fontSize: 16,
      marginTop: 5,
      backgroundColor: colors.primaryWhite,
    },
    headline: {
      color: colors.primaryWhite,
      fontSize: 42,
      top: -96,
    },
    subheading: {
      color: theme.colors.onBackground,
      fontSize: 26,
    },
    errorMessage: {
      color: colors.error,
      fontSize: 18,
      marginBottom: 10,
    },
    input: {
      width: '100%',
      backgroundColor: theme.colors.background,
      color: theme.colors.onBackground,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      height: 24,
    },
    errorInput: {
      borderColor: 'red',
      borderWidth: 2,
    },
    button_outlined: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.secondary,
      borderWidth: 2,
      borderRadius: 20,
      height: 40,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button_filled: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      borderWidth: 2,
      borderRadius: 20,
      height: 40,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button_text: {
      backgroundColor: 'transparent',
      borderRadius: 20,
      height: 40,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText_filled: {
      color: theme.colors.background,
      fontSize: 16,
    },
    buttonText_outlined: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: 600,
    },
    signinButton: {
      marginBottom: 10,
    },
  });

}