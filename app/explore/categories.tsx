import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Divider } from 'react-native-paper';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { Category, getAllCategories } from '../db';

export default function AllCategoriesPage() {
	const styles = useStyles();
	const theme = useAppTheme();
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		(async () => {
			try {
				const cats = await getAllCategories();
				setCategories(cats);
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	return (
		<>
			<Stack.Screen
				options={{
					title: 'All Categories',
					headerStyle: { backgroundColor: theme.colors.background },
					headerTintColor: theme.colors.onBackground,
					headerTitleStyle: { color: theme.colors.onBackground },
				}}
			/>
			<ScrollView
				style={{ flex: 1, backgroundColor: theme.colors.background }}
				contentContainerStyle={{ padding: 20 }}
			>
				{loading ? (
					<View style={{ alignItems: 'center', marginTop: 40 }}>
						<ActivityIndicator size="large" color={theme.colors.primary} />
					</View>
				) : categories.length === 0 ? (
					<View style={{ alignItems: 'center', marginTop: 40 }}>
						<Text style={{ ...styles.text, color: theme.colors.onSurfaceVariant }}>
							No categories found.
						</Text>
					</View>
				) : (
					categories.map((category, index) => (
						<React.Fragment key={category.categoryId}>
							<TouchableOpacity
								onPress={() => router.push({
									pathname: './category/[categoryId]',
									params: { categoryId: category.categoryId.toString() }
								})}
								activeOpacity={0.1}
								style={{
									paddingVertical: 16,
									flexDirection: 'row',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<Text style={{ ...styles.tinyText, fontSize: 18, fontWeight: 100, marginBottom: 0 }}>
									{category.name}
								</Text>
								<Ionicons name="arrow-forward" size={20} color={theme.colors.onBackground} style={{ opacity: 0.7 }} />
							</TouchableOpacity>
							{index < categories.length - 1 && <Divider />}
						</React.Fragment>
					))
				)}
				<View style={{ height: 100 }} />
			</ScrollView>
		</>
	);
}


