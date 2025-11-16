import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppStore, Verse } from '../store';
import useAppTheme from '../theme';

interface Props {
  verse: Verse;
  onSave?: (verse: Verse) => void;
  onRead?: (verse: Verse) => void;
  onShare?: (verse: Verse) => void;
}

export default function SearchResultVerseCard({ verse, onSave, onRead, onShare }: Props) {
  const theme = useAppTheme();
  const savedAdjustment = useAppStore((state) => state.verseSaveAdjustments[verse.verse_reference] ?? 0);
  const savedCount = (verse.users_Saved_Verse ?? 0) + savedAdjustment;
  const savedLabel = savedCount === 1 ? 'save' : 'saves';
  const memorizedCount = verse.users_Memorized ?? 0;

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      padding: 16,
      marginHorizontal: 8,
      borderRadius: 12,
      width: 300,
      alignItems: 'stretch',
      justifyContent: 'space-between',
    }}>
      <View>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: theme.colors.onBackground,
          marginBottom: 8,
          fontFamily: 'Inter'
        }} numberOfLines={1}>
          {verse.verse_reference}
        </Text>
        <Text style={{
          fontSize: 14,
          color: theme.colors.onSurfaceVariant,
          fontFamily: 'Inter',
          lineHeight: 20,
          marginBottom: 12
        }} numberOfLines={5}>
          {verse.text}
        </Text>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="people-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
              {savedCount} {savedLabel}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontFamily: 'Inter' }}>
              {memorizedCount || 0} memorized
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12, gap: 18 }}>
        <TouchableOpacity
          activeOpacity={0.1}
          onPress={() => onSave && onSave(verse)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="bookmark-outline" size={18} color={theme.colors.onBackground} />
          <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.1}
          onPress={() => onRead && onRead(verse)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="library-outline" size={18} color={theme.colors.onBackground} />
          <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Read</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          activeOpacity={0.1}
          style={{ flexDirection: 'row', alignItems: 'center' }} 
          onPress={() => onShare && onShare(verse)}
        >
          <Ionicons name="share-social-outline" size={18} color={theme.colors.onBackground} />
          <Text style={{ marginLeft: 6, color: theme.colors.onBackground }}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


