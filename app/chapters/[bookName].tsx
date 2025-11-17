import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import React, { useLayoutEffect, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { bibleBooks } from '../bibleData';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function ChaptersPage() {
	const styles = useStyles();
	const theme = useAppTheme();
	const navigation = useNavigation();
	const { bookName } = useLocalSearchParams<{ bookName: string }>();

	const decodedBookName = useMemo(() => (bookName ? decodeURIComponent(bookName) : ''), [bookName]);
	const selectedBookData = useMemo(
		() => bibleBooks.find((b) => b.name === decodedBookName),
		[decodedBookName]
	);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: decodedBookName || '',
			headerStyle: {
				backgroundColor: theme.colors.background,
			},
			headerTintColor: theme.colors.onBackground,
			headerTitleStyle: {
				color: theme.colors.onBackground,
			},
			headerVisible: false,
		});
	}, [navigation, decodedBookName, theme]);

	const handleChapterSelect = (chapter: number) => {
		router.push(`/book/${encodeURIComponent(decodedBookName)}?chapter=${chapter}`);
	};

	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background }}>
				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{ padding: 20 }}
				>
					<View
						style={{
							flexDirection: 'row',
							flexWrap: 'wrap',
							justifyContent: 'flex-start',
							width: '100%',
							marginTop: 10,
						}}
					>
						{Array.from({ length: selectedBookData?.chapters || 0 }, (_, i) => i + 1).map(
							(chapterNum) => (
								<TouchableOpacity
									key={chapterNum}
									onPress={() => handleChapterSelect(chapterNum)}
									activeOpacity={0.3}
									style={{
										width: '25%',
										padding: 5,
									}}
								>
									<View
										style={{
											padding: 10,
											borderRadius: 10,
											backgroundColor: theme.colors.background,
											borderColor: theme.colors.surface2,
											borderWidth: 3,
											aspectRatio: 1,
											justifyContent: 'center',
											alignItems: 'center',
										}}
									>
										<Text
											style={{
												...styles.text,
												marginBottom: 0,
												fontSize: 16,
												opacity: 1,
												fontWeight: '600',
											}}
										>
											{chapterNum}
										</Text>
									</View>
								</TouchableOpacity>
							)
						)}
					</View>
				</ScrollView>
		</View>
	);
}


