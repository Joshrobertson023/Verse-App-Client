//Here check if user is logged in (ex: if !user redirect to signin)
import { useAuth } from '@/context/AuthContext';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
    const { session, loading } = useAuth();

    // While loading
    if (loading) {
        return (
            <View style={{ 
                backgroundColor: '#33302F', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

      // Not logged in → redirect to login
    if (!session) {
        return <Redirect href="/login" />;
    }

    // Logged in → render protected routes
    return (
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        </Stack>
    );
}