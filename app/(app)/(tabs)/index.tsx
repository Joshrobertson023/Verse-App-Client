import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Collections screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33302F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#EAE9FC',
  },
  button: {
    backgroundColor: 'transparent',
    borderColor: '#EAE9FC',
    borderWidth: 2,
    borderRadius: 20,
    height: 35,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#EAE9FC',
    fontSize: 16,
  }
});