//Here check if user is logged in (ex: if !user redirect to signin)
import { Stack } from 'expo-router';

export default function AppLayout() {
    return (
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    );

}