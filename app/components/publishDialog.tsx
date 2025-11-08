import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Chip, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { Category, getAllCategories } from '../db';
import useStyles from '../styles';
import useAppTheme from '../theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onPublish: (description: string | undefined, selectedCategoryIds: number[]) => Promise<void> | void;
};

export default function PublishDialog({ visible, onDismiss, onPublish }: Props) {
  const styles = useStyles();
  const theme = useAppTheme();
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const cats = await getAllCategories();
      setCategories(cats);
    })();
  }, [visible]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) 
      next.delete(id); 
    else 
      next.add(id);
    setSelected(next);
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      await onPublish(description.trim() || undefined, Array.from(selected));
      onDismiss();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ backgroundColor: theme.colors.surface }}>
        <Dialog.Title>Publish Collection</Dialog.Title>
        <Dialog.Content>
          <TextInput
            mode="outlined"
            multiline={true}
            maxLength={200}
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
          />
          <Text style={{ ...styles.text, marginBottom: 6 }}>Select categories</Text>
          <ScrollView style={{ maxHeight: 220 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(c => (
                <Chip
                  key={c.categoryId}
                  selected={selected.has(c.categoryId)}
                  onPress={() => toggle(c.categoryId)}
                  style={{ marginBottom: 8, backgroundColor: theme.colors.surface2 }}
                >
                  {c.name}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={handlePublish} loading={loading} disabled={loading}>
            Publish
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}



