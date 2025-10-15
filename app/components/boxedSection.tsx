import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Divider } from 'react-native-paper';
import useStyles from '../styles';

interface BoxedSectionProps {
  title: string;
  numericStat: number;
  alert?: boolean;
}

const BoxedSection: React.FC<BoxedSectionProps> = ({ title, numericStat, alert }) => {
  const styles = useStyles();
  return (
    <>
    <TouchableOpacity style={{ width: '100%', height: 50, justifyContent: 'center'}}>
        <View style={{ width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {alert ? <Ionicons name='alert-circle' size={22} color={'gray'} /> : null}
                <Text style={{...styles.tinyText, marginLeft: 8}}>{numericStat}</Text>
              </View>
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