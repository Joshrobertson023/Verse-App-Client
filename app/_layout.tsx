import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider>
        <Stack>
          <Stack.Screen 
            name="login"
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="createaccount"
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="forgot"
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="(app)"
            options={{ headerShown: false }} 
          />
        </Stack>
      </PaperProvider>
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33302F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  text: {
    color: '#EAE9FC',
    fontSize: 22,
    marginBottom: 16,
  },
  headline: {
    color: '#EAE9FC',
    fontSize: 42,
    top: -96,
  },
  input: {
    width: '100%',
    backgroundColor: '#444',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button_outlined: {
    backgroundColor: 'transparent',
    borderColor: '#EAE9FC',
    borderWidth: 2,
    borderRadius: 20,
    height: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button_filled: {
    backgroundColor: '#EAE9FC',
    borderColor: '#EAE9FC',
    borderWidth: 2,
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
    color: '#EAE9FC',
    fontSize: 16,
  },
  signinButton: {
    marginBottom: 10,
  },
});