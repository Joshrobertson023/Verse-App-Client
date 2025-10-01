//Here check if user is logged in (ex: if !user redirect to signin)
import { Redirect, Stack } from 'expo-router';

export default function AppLayout() {
    const session = false;
    return !session 
        ? 
        <Redirect href="/login"/> 
        : 
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
}