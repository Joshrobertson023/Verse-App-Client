  import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import useStyles from '../styles';

  export default function Index() {
    const styles = useStyles();

    const [title, setTitle] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    return (
      <View style={styles.container}>
        <TextInput label="Collection Title" value={title} onChangeText={setTitle} style={styles.input} />
        { errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null }
        <TouchableOpacity style={styles.button_outlined} onPress={() => {
          if (title.trim() === '') {
            setErrorMessage('Title cannot be empty.');
            return;
          } else {
            setErrorMessage('');
          }

          alert('Collection added!');
          setTitle('');
          setErrorMessage('');
        }}>
          <Text style={styles.buttonText_outlined}>Add Collection</Text>
        </TouchableOpacity>
      </View>
    );
  }