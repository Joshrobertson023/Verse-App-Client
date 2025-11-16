import React from 'react';
import { Stack } from 'expo-router';
import useAppTheme from '../theme';

export default function ChaptersLayout() {
	const theme = useAppTheme();
	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: theme.colors.background },
				headerTintColor: theme.colors.onBackground,
				headerTitleStyle: { color: theme.colors.onBackground },
				contentStyle: { backgroundColor: theme.colors.background },
			}}
		>
			<Stack.Screen 
				name="[bookName]" 
				options={{
					headerShown: true,
				}}
			/>
		</Stack>
	);
}


