import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { Divider, Surface } from 'react-native-paper';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { bibleBooks } from '../bibleData';
import useStyles from '../styles';
import useAppTheme from '../theme';

function CustomBackButton({ onPress }: { onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
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
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleBookSelect = (bookName: string) => {
    setSelectedBook(bookName);
  };

  const handleChapterSelect = (bookName: string, chapter: number) => {
    // Navigate to book page with chapter parameter
    router.push(`../book/${encodeURIComponent(bookName)}?chapter=${chapter}`);
  };

  // Scroll to top when book selection changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [selectedBook]);

  const selectedBookData = selectedBook ? bibleBooks.find(b => b.name === selectedBook) : null;

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: selectedBook ? selectedBook : 'Select a Book',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.onBackground,
          headerTitleStyle: {
            color: theme.colors.onBackground,
          },
          headerLeft: selectedBook ? () => (
            <CustomBackButton onPress={() => setSelectedBook(null)} />
          ) : undefined,
        }} 
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 20 }}
        >
          {!selectedBook ? (
            <>
              {bibleBooks.map((book, index) => (
                <React.Fragment key={index}>
                  {/* Show section headers */}
                  {index === 0 && (
                    <>
                      <Text style={{ 
                        ...styles.subheading, 
                        fontSize: 22,
                        marginTop: 10,
                        marginBottom: 15,
                        color: '#fff',
                      }}>
                        Old Testament
                      </Text>
                    </>
                  )}
                  {book.name === 'Matthew' && (
                    <>
                      <Text style={{ 
                        ...styles.subheading, 
                        fontSize: 22,
                        marginTop: 50,
                        marginBottom: 15,
                        color: '#fff',
                      }}>
                        New Testament
                      </Text>
                    </>
                  )}
                  
                  <TouchableOpacity
                    onPress={() => handleBookSelect(book.name)}
                    style={{
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ ...styles.text, marginBottom: 0 }}>
                      {book.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.onBackground} />
                  </TouchableOpacity>
                  {index < bibleBooks.length - 1 && <Divider style={{ marginVertical: 0 }} />}
                </React.Fragment>
              ))}
            </>
          ) : (
            <>
              <Text style={{ ...styles.subheading, marginBottom: 20 }}>Select a Chapter</Text>
              
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                justifyContent: 'flex-start',
                width: '100%',
              }}>
                {Array.from({ length: selectedBookData?.chapters || 0 }, (_, i) => i + 1).map((chapterNum) => (
                  <TouchableOpacity
                    key={chapterNum}
                    onPress={() => handleChapterSelect(selectedBook, chapterNum)}
                    style={{
                      width: '25%',
                      padding: 5,
                    }}
                  >
                    <Surface style={{ 
                      padding: 15, 
                      borderRadius: 10, 
                      backgroundColor: theme.colors.surface,
                      aspectRatio: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ 
                        ...styles.text, 
                        marginBottom: 0,
                        fontSize: 16,
                        fontWeight: '600',
                      }}>
                        {chapterNum}
                      </Text>
                    </Surface>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}
