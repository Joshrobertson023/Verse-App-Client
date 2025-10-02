import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const AuthContext = createContext()

export const AuthProvider = ({children}) => {
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState(null)
    const [user, setUser] = useState(null)

      useEffect(() => {
        const checkSession = async () => {
        // Pretend we check AsyncStorage or API here
        await new Promise((r) => setTimeout(r, 1000));
        // Example: no user found
        setSession(false);
        setLoading(false);
        };

        checkSession();
    }, []);

    const signin = async (username, password) => {
        setLoading(true);
        // Example sign-in logic
        await new Promise((r) => setTimeout(r, 1000));
        setUser({ username });
        setSession(true);
        setLoading(false);
    };

    const signout = async () => {
        setLoading(true);
        await new Promise((r) => setTimeout(r, 500));
        setUser(null);
        setSession(false);
        setLoading(false);
    };

      const value = {
    session,
    user,
    loading,
    signin,
    signout,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
