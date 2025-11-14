import { Link, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createCollectionDB, createUser, getUserCollections, loginUser, updateCollectionsOrder } from '../db';
import { Collection, useAppStore, User } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function CreatePasswordScreen() {
  const styles = useStyles();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const theme = useAppTheme();
  const loginInfo = useAppStore.getState().loginInfo;
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const setCollections = useAppStore((state) => state.setCollections);

const nextClick = async () => {
    try {
        Keyboard.dismiss();

        setLoading(true);

        if (!password || !confirmPassword) {
            setErrorMessage('Please enter all fields');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 11) {
            setErrorMessage('Password must be at least 11 characters long');
            setLoading(false);
            return;
        }

        const newUser: User = {
            username: loginInfo?.username || '',
            email: loginInfo?.email || '',
            firstName: loginInfo?.firstName || '',
            lastName: loginInfo?.lastName || '',
            hashedPassword: password, // todo: hash password
            streak: [],
            streakLength: 0,
            numberPublishedCollections: 0,
            versesMemorized: 0,
            versesOverdue: 0,
            collectionsSortBy: 1,
            points: 0,
            bibleVersion: loginInfo?.bibleVersion || 'KJV',
        }

        await createUser(newUser);
        const loggedInUser = await loginUser(newUser);
        setUser(loggedInUser);
        await SecureStore.setItemAsync('userToken', loggedInUser.authToken || '');
        console.log(loggedInUser);
        console.log('set user token: ' + loggedInUser.authToken || '');
        const favoritesCollection: Collection = {
            title: 'Favorites',
            visibility: 'Private',
            userVerses: [],
            favorites: true,
            authorUsername: loggedInUser.username,
            username: loggedInUser.username,
        }
        await createCollectionDB(favoritesCollection, loggedInUser.username);
        const collections = await getUserCollections(loggedInUser.username);
        setCollections(collections);
        const lastCollectionId = collections.at(0)?.collectionId;
        console.log(lastCollectionId?.toString());
        await updateCollectionsOrder(lastCollectionId ? lastCollectionId.toString() : '', loggedInUser.username);
        loggedInUser.collectionsOrder = lastCollectionId?.toString();
        setUser(loggedInUser);
        setLoading(false);
        router.push('/');
    } catch (error) {
        console.error(error);
        alert('An error occurred while creating your account. Please try again. | ' + error);
        setLoading(false);
        return;
    }
};


    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{...styles.centered, marginBottom: 150}}>
                <Text style={{...styles.text, marginBottom: 20}}>Create a Password:</Text>
                <TextInput keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            textContentType="password"
                            secureTextEntry={!showPassword}
                            label="Password" mode="outlined" style={styles.input} value={password}
                            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword((prev) => !prev)} />}
                            onChangeText={(text) => setPassword(text)} />
                <TextInput keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            textContentType="password"
                            secureTextEntry={!showConfirmPassword}
                            label="Confirm Password" mode="outlined" style={styles.input} value={confirmPassword} 
                            right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off' : 'eye'} onPress={() => setShowConfirmPassword((prev) => !prev)} />}
                            onChangeText={(text) => setConfirmPassword(text)} />
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TouchableOpacity style={{...styles.button_filled, marginTop: 12}} onPress={() => {nextClick()}}>
                    {loading ? (
                        <Text style={styles.buttonText_filled}>
                            <ActivityIndicator animating={true} color={theme.colors.background} />
                        </Text> 
                    ) : (
                        <Text style={styles.buttonText_filled}>Create Account</Text>
                    )}
                </TouchableOpacity>
                <Text style={{...styles.tinyText, marginTop: 12, textAlign: 'center', lineHeight: 26}}>
                  By creating an account, you agree to our
                  {' '}
                  <Link href="/privacy" style={{ textDecorationLine: 'underline' }}>
                    <Text style={{...styles.tinyText, color: theme.colors.primary}}>Privacy Policy</Text>
                  </Link>
                  {' '}and{' '}
                  <Link href="/terms" style={{ textDecorationLine: 'underline' }}>
                    <Text style={{...styles.tinyText, color: theme.colors.primary}}>Terms of Service</Text>
                  </Link>
                  .
                </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}