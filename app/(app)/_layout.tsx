//Here check if user is logged in (ex: if !user redirect to signin)
import { useAuth } from '@/context/AuthContext';
import { Redirect, Stack } from 'expo-router';

export default function AppLayout() {
    const session = useAuth();
    if (!session)
        return <Redirect href="/login"/> 
    else return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    )
}