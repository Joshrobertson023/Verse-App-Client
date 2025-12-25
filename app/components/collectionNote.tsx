import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { CollectionNote } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

type Props = {
	note: CollectionNote;
	isOwned: boolean;
	onMenuPress?: (note: CollectionNote) => void;
};

export default function CollectionNoteItem({ note, isOwned, onMenuPress }: Props) {
	const styles = useStyles();
	const theme = useAppTheme();

	return (
		<View style={{minWidth: '100%', marginBottom: 20}}>
			<View style={{minWidth: '100%', borderRadius: 3}}>
				<View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
					<View style={{flexDirection: 'row', alignItems: 'center'}}>
						<Text style={{...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600}}>Note</Text>
					</View>
					{isOwned && onMenuPress && (
						<TouchableOpacity
							activeOpacity={0.1}
							onPress={() => onMenuPress(note)}
							style={{ padding: 8, marginTop: -20 }}
						>
							<View style={{flexDirection: 'row', alignItems: 'center'}}>
								<Ionicons name="ellipsis-vertical" size={22} color={theme.colors.onBackground} />
							</View>
						</TouchableOpacity>
					)}
				</View>
				<Text style={{...styles.text, fontFamily: 'Noto Serif', fontSize: 16}}>
					{note.text}
				</Text>
			</View>
			<Divider style={{marginHorizontal: -50, marginTop: 20}} />
		</View>
	);
}


