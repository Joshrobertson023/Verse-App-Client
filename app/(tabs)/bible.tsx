import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
      <View style={{ flex: 1, backgroundColor: theme.colors.background, marginTop: 30 }}>
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
          ) : (
            <>
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                justifyContent: 'flex-start',
                width: '100%',
                marginTop: 50
              }}>
                {Array.from({ length: selectedBookData?.chapters || 0 }, (_, i) => i + 1).map((chapterNum) => (
                  <TouchableOpacity
                    key={chapterNum}
                    onPress={() => handleChapterSelect(selectedBook, chapterNum)}
                    activeOpacity={0.3}
                    style={{
                      width: '25%',
                      padding: 5,
                    }}
                  >
                    <View style={{ 
                      padding: 10, 
                      borderRadius: 10, 
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.surface2,
                      borderWidth: 3,
                      aspectRatio: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ 
                        ...styles.text, 
                        marginBottom: 0,
                        fontSize: 16,
                        opacity: 1,
                        fontWeight: '600',
                      }}>
                        {chapterNum}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
          {selectedBook ? (
            <Surface style={{
                position: 'absolute',
                top: 10,
                left: 25,
                backgroundColor: theme.colors.surface,
                borderRadius: 5000,
                padding: 5
            }} elevation={4}>
              <TouchableOpacity style={{
                marginRight: 2
              }} onPress={() => setSelectedBook(null)}>
                <Ionicons name="chevron-back" size={32} color={theme.colors.onBackground} />
              </TouchableOpacity>
            </Surface>
          ) : (null)}
      </View>
    </>
  );
}
