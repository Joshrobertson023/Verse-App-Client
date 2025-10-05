import { StyleSheet } from 'react-native';
import colors from './colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33302F',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  collectionsContainer: {
    flex: 1,
    width: '100%',
  },
  collectionItem: {
    height: 100,
    minHeight: 100,
    marginTop: 25,
    outlineColor: '#585858',
    outlineWidth: 4,
    borderRadius: 6,
    display: 'flex',
    paddingLeft: 15,
    padding: 10,
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 10,
  },
  text: {
    color: colors.primaryWhite,
    fontSize: 20,
    marginBottom: 16,
  },
  inputText: {
    color: colors.primaryWhite,
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
    color: colors.primaryWhite,
    fontSize: 26,
    top: -40,
  },
  errorMessage: {
    color: colors.error,
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    backgroundColor: '#444',
    color: colors.primaryWhite,
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
    borderColor: colors.primaryWhite,
    borderWidth: 2,
    borderRadius: 20,
    height: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button_filled: {
    backgroundColor: colors.primaryWhite,
    borderColor: colors.primaryWhite,
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
    color: '#161616ff',
    fontSize: 16,
  },
  buttonText_outlined: {
    color: colors.primaryWhite,
    fontSize: 16,
  },
  signinButton: {
    marginBottom: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default styles