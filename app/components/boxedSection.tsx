import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Divider } from 'react-native-paper';
import getStyles from '../styles';

interface BoxedSectionProps {
  title: string;
  alert?: boolean;
}

const BoxedSection: React.FC<BoxedSectionProps> = ({ title, alert }) => {
  const styles = getStyles();
  return (
    <>
    <TouchableOpacity style={{ width: '100%'}}>
        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {alert ? <Ionicons name='alert-circle' size={20} color={'gray'} /> : null}
                <Text style={{...styles.tinyText, marginLeft: 8}}>{title}</Text>
            </View>
            <Ionicons name='chevron-forward' size={20} color={'gray'} />
        </View>
    </TouchableOpacity>
    <Divider style={{ marginBottom: 10, marginTop: 10 }} />
    </>
  )
}

export default BoxedSection;