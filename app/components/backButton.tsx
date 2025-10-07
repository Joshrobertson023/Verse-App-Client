import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from 'expo-router';
import React from 'react';
import { View } from "react-native";
import { Text } from "react-native-paper";
import useStyles from '../styles';
import useAppTheme from '../theme';

interface BackButtonProps {
    title?: string;
}

export default function BackButton({title}: BackButtonProps) {
    const styles = useStyles();
    const theme = useAppTheme();
    return (
        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', zIndex: 1, position: 'absolute', top: 50, left: 0 }}>
            <Ionicons onPress={() => {router.back()}} name="chevron-back" size={24} color={theme.colors.onBackground}
            style={{padding: 20}} />
            <Text style={styles.subheading}>{title}</Text>
        </View>
    )
}