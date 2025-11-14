import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Dialog, Portal } from 'react-native-paper';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface BibleHelpPopupProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function BibleHelpPopup({ visible, onDismiss }: BibleHelpPopupProps) {
  const styles = useStyles();
  const theme = useAppTheme();

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          maxWidth: '90%',
          alignSelf: 'center',
        }}
      >
        <Dialog.Content style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name="information-circle" size={48} color={theme.colors.primary} />
          </View>
          
          <Text
            style={{
              ...styles.text,
              fontSize: 20,
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: 16,
              color: theme.colors.onSurface,
            }}
          >
            How to Interact with Verses
          </Text>

          <Text
            style={{
              ...styles.text,
              fontSize: 16,
              textAlign: 'center',
              marginBottom: 20,
              color: theme.colors.onSurfaceVariant,
              lineHeight: 24,
            }}
          >
            Tap or hold on a verse to show more info and actions. You can save verses to collections, view commentary, and more!
          </Text>

          {/* Image placeholder */}
          <View
            style={{
              width: '100%',
              height: 200,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 8,
              marginBottom: 20,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.outline,
              borderStyle: 'dashed',
            }}
          >
            <Ionicons name="image-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text
              style={{
                ...styles.tinyText,
                marginTop: 8,
                color: theme.colors.onSurfaceVariant,
              }}
            >
              Screenshot placeholder
            </Text>
          </View>
        </Dialog.Content>

        <Dialog.Actions
          style={{
            paddingHorizontal: 24,
            paddingBottom: 24,
            justifyContent: 'center',
          }}
        >
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              ...styles.button_filled,
              backgroundColor: theme.colors.primary,
              minWidth: 120,
            }}
          >
            <Text style={{ ...styles.buttonText_filled, color: theme.colors.onPrimary }}>
              Got it!
            </Text>
          </TouchableOpacity>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

