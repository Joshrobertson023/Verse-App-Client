import { createContext, useState } from 'react'
import { Text } from 'react-native'

const AuthContext = createContext()

const AuthProvider = ({children}) => {
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState(false)
    const [user, setUser] = userState(false)

    const signin = async () => {}
    const signout = async () => {}

    const contextData = {session, user, signin, signout}
    return (
        <AuthContext.Provider value={contextData}>
            {loading ? (
                <SafeAreaView>
                    <Text>Loading...</Text>
                </SafeAreaView>
            ) : (
                children
            )}
        </AuthContext.Provider>
    )
}

const userAuth = () => {return useContext(AuthContext)}

export { AuthContext, AuthProvider, useAuth }
