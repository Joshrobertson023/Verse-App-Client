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
      height: 80,
      marginTop: 25,
      borderRadius: 10,
      display: 'flex',
      justifyContent: 'flex-start',
      width: '100%',
      marginBottom: 0,
      backgroundColor: theme.colors.background,
    },
    text: {
      color: theme.colors.onBackground,
      fontSize: 20,
      marginBottom: 16,
      fontFamily: 'Inter',
    },
    startupText: {
      color: theme.colors.onBackground,
      fontSize: 24,
      marginBottom: 16,
      fontFamily: 'Inter',
      fontWeight: 900,
    },
    tinyText: {
      color: theme.colors.onBackground,
      fontSize: 16,
      fontFamily: 'Inter',
    },
    inputText: {
      color: theme.colors.onBackground,
      fontSize: 16,
      marginTop: 5,
      backgroundColor: colors.primaryWhite,
      fontFamily: 'Inter',
    },
    headline: {
      color: colors.primaryWhite,
      fontSize: 42,
      top: -96,
      fontFamily: 'Inter',
    },
    subheading: {
      color: theme.colors.onBackground,
      fontSize: 26,
      fontFamily: 'Inter',
    },
    errorMessage: {
      color: colors.error,
      fontSize: 18,
      marginBottom: 10,
      fontFamily: 'Inter',
    },
    input: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      color: theme.colors.onBackground,
      borderRadius: 8,
      marginBottom: 12,
      height: 50,
      borderWidth: 0.2,
    },
    errorInput: {
      borderColor: 'red',
      borderWidth: 2,
    },
    button_outlined: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.onBackground,
      borderWidth: 1,
      borderRadius: 20,
      height: 40,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button_filled: {
      backgroundColor: theme.colors.primary,
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
      fontFamily: 'Inter',
    },
    buttonText_filled: {
      color: theme.colors.background,
      fontSize: 16,
      fontFamily: 'Inter',
    },
    buttonText_outlined: {
      color: theme.colors.onBackground,
      fontSize: 16,
      fontWeight: 600,
      fontFamily: 'Inter',
    },
    signinButton: {
      marginBottom: 10,
    },
    // Global button styles for React Native Button component
    button: {
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonOutlined: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.onBackground,
      borderWidth: 1,
      borderRadius: 20,
      height: 40,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonFilled: {
      backgroundColor: theme.colors.primary,
      borderRadius: 20,
      height: 40,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      backgroundColor: 'transparent',
      borderRadius: 20,
      height: 40,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

}