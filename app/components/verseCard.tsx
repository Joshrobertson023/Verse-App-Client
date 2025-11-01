import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { Verse } from '../store';

interface Props {
  verse: Verse;
  rightMeta?: 'saved' | 'memorized';
}

export default function VerseCard({ verse, rightMeta = 'saved' }: Props) {
  const styles = useStyles();
  const theme = useAppTheme();

  const rightCount = rightMeta === 'saved' ? verse.users_Saved_Verse ?? (verse as any).Users_Saved_Verse : verse.users_Memorized ?? (verse as any).Users_Memorized;

  return (
    <View
      style={{
        width: 300,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.outline,
        padding: 14,
        marginHorizontal: 8,
        backgroundColor: theme.colors.surface
      }}
    >
      <Text style={{ ...styles.text, fontWeight: 700 }} numberOfLines={1}>{verse.verse_reference}</Text>
      <Text style={{ ...styles.text, marginTop: 6 }} numberOfLines={3}>{verse.text ?? (verse as any).Text}</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <View />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={rightMeta === 'saved' ? 'people' : 'trophy'} size={16} color={theme.colors.onSurface} style={{ marginRight: 6 }} />
          <Text style={styles.tinyText}>{rightCount || 0} {rightMeta === 'saved' ? 'Saves' : 'Memorized'}</Text>
        </View>
      </View>
    </View>
  );
}



