import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
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
            <View style={{...styles.centered, marginBottom: 150}}>
                <Text style={{...styles.text, marginBottom: 20}}>Create a Password:</Text>
                <TextInput keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            textContentType="password" label="Password" mode="outlined" style={styles.input} value={password}
                            onChangeText={(text) => setPassword(text)} />
                <TextInput keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            textContentType="password" label="Confirm Password" mode="outlined" style={styles.input} value={confirmPassword} 
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
            </View>
        </SafeAreaView>
    )
}