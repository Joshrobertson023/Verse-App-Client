import React from 'react';
import { Text, View } from 'react-native';
import { useAppStore } from '../store';
import useStyles from '../styles';

export default function ExploreScreen() {
  const styles = useStyles();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const addCollection = useAppStore((state) => state.addCollection);

    return (
        <View style={styles.container}>
                    <Text style={styles.text}>This area is currently under construction.</Text>
        </View>
    )
}