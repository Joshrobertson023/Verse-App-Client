import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface PracticeModeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLearn: () => void;
}

export default function PracticeModeModal({ visible, onClose, onSelectLearn }: PracticeModeModalProps) {
  const theme = useAppTheme();
  const styles = useStyles();

  const handleLearn = () => {
    onClose();
    onSelectLearn();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.text, { fontSize: 24, fontWeight: '700', marginBottom: 30, textAlign: 'center' }]}>
            Choose Practice Mode
          </Text>
          
          <View style={modalStyles.buttonGrid}>
            {/* Learn Button - Enabled */}
            <TouchableOpacity
              style={[modalStyles.modeButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.onBackground, borderWidth: .5 }]}
              onPress={handleLearn}
            >
              <Ionicons name="book" size={48} color={theme.colors.onBackground} />
              <Text style={[styles.text, { fontSize: 16, fontWeight: '600', color: theme.colors.onBackground, marginTop: 12 }]}>
                Learn
              </Text>
            </TouchableOpacity>

            {/* Practice Typing Verse Button - Disabled */}
            <TouchableOpacity
              style={[modalStyles.modeButton, { backgroundColor: theme.colors.surface2, opacity: 0.5 }]}
              disabled={true}
              activeOpacity={1}
            >
              <Ionicons name="create-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.text, { fontSize: 16, fontWeight: '600', color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }]}>
                Practice Typing Verse
              </Text>
            </TouchableOpacity>

            {/* Drag and Drop Button - Disabled */}
            <TouchableOpacity
              style={[modalStyles.modeButton, { backgroundColor: theme.colors.surface2, opacity: 0.5 }]}
              disabled={true}
              activeOpacity={1}
            >
              <Ionicons name="move-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.text, { fontSize: 16, fontWeight: '600', color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }]}>
                Drag and Drop
              </Text>
            </TouchableOpacity>

            {/* Flashcards Button - Disabled */}
            <TouchableOpacity
              style={[modalStyles.modeButton, { backgroundColor: theme.colors.surface2, opacity: 0.5 }]}
              disabled={true}
              activeOpacity={1}
            >
              <Ionicons name="albums-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.text, { fontSize: 16, fontWeight: '600', color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }]}>
                Flashcards
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[modalStyles.cancelButton, { backgroundColor: theme.colors.surface2, marginTop: 20, height: 50 }]}
            onPress={onClose}
          >
            <Text style={[styles.text, { fontSize: 16, fontWeight: '600', color: theme.colors.onBackground, paddingTop: 13 }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  buttonGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  modeButton: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelButton: {
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});





