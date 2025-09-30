import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';
import { useSession } from './ctx';

export default function SignIn() {
  const { signIn } = useSession();

  const handleSignIn = async () => {
    // Simulate authentication
    await signIn();
    router.replace('./(tabs)/index'); // Navigate to the tabs after successful login
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Sign In Screen</Text>
      <Button title="Sign In" onPress={handleSignIn} />
    </View>
  );
}