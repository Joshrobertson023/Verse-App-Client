import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Surface } from 'react-native-paper';
import { bibleBooks } from '../bibleData';
import useStyles from '../styles';
import useAppTheme from '../theme';

function CustomBackButton({ onPress }: { onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.1}
      style={{
        marginLeft: 10,
        padding: 5,
      }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.colors.onBackground} />
    </TouchableOpacity>
  );
}

export default function BibleScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const handleBookSelect = (bookName: string) => {
    router.push(`../chapters/${encodeURIComponent(bookName)}`);
  };

  // Scroll to top when book selection changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, []);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Select a Book',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.onBackground,
          headerTitleStyle: {
            color: theme.colors.onBackground,
          },
          headerLeft: undefined,
        }} 
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background, marginTop: 30 }}>
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 20 }}
        >
          <>
            {bibleBooks.map((book, index) => (
              <React.Fragment key={index}>
                {/* Show section headers */}
                {index === 0 && (
                  <>
                    <Text style={{ 
                      ...styles.subheading, 
                      fontSize: 24,
                      marginBottom: 15,
                      fontWeight: 800,
                      color: theme.colors.onBackground,
                    }}>
                      Old Testament
                    </Text>
                  </>
                )}
                {book.name === 'Matthew' && (
                  <>
                    <Text style={{ 
                      ...styles.subheading, 
                      fontSize: 24,
                      marginTop: 50,
                      marginBottom: 15,
                      fontWeight: 800,
                      color: theme.colors.onBackground,
                    }}>
                      New Testament
                    </Text>
                  </>
                )}
                
                <TouchableOpacity
                  onPress={() => handleBookSelect(book.name)}
                  activeOpacity={0.1}
                  style={{
                    paddingVertical: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ ...styles.tinyText, fontSize: 18, fontWeight: 100, marginBottom: 0 }}>
                    {book.name}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.onBackground} style={{opacity: 0.7}} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </>
        </ScrollView>
          {null}
      </View>
    </>
  );
}
