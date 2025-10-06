import React from 'react';
import { View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { MarkedDates } from 'react-native-calendars/src/types';
import { Text } from 'react-native-paper';
import { useAppStore } from '../store';
import getStyles from '../styles';
import useAppTheme from '../theme';

const Streak = () => {
  const styles = getStyles();
  const theme = useAppTheme();
  const date = new Date();
  const streak = useAppStore((state) => state.streak);

  const markedDates = React.useMemo(() => {
    const markings: MarkedDates = {};

    streak.forEach((streakDay) => {
        if (streakDay.count > 0) {
            markings[streakDay.date] = {
                selected: true,
                selectedColor: 'green',
            }
        } else {
            markings[streakDay.date] = {
                selected: true,
                selectedColor: 'red',
            }
        }
    })
    return markings;
  }, [streak, theme.colors.primary]);

  return (    
    <View style={{flex: 1, justifyContent: 'center'}}>
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}> 
        <Text style={{fontSize: 48, color: theme.colors.onBackground, fontWeight: 'bold'}}>48</Text>
        <Text style={{fontSize: 24, color: theme.colors.onBackground}}>Day Streak</Text>
        <Text style={{fontSize: 14, color: theme.colors.onBackground, marginTop: 10}}>You're doing great!</Text>
    </View>
        <Calendar
        style={{
            borderWidth: 1,
            borderColor: 'transparent',
            width: '90%',
            alignSelf: 'center',
        }}
            theme={{
                backgroundColor: theme.colors.background,
                calendarBackground: theme.colors.background,
                textSectionTitleColor: theme.colors.onBackground,
                selectedDayBackgroundColor: theme.colors.onBackground,
                selectedDayTextColor: theme.colors.onBackground,
                todayTextColor: theme.colors.onBackground,
                dayTextColor: theme.colors.onBackground,
                textDisabledColor: theme.colors.secondary,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.onBackground,
                arrowColor: theme.colors.onBackground,
                monthTextColor: theme.colors.onBackground,
                indicatorColor: theme.colors.onBackground,
            }}
        current={date.toISOString().split('T')[0]}
        onDayPress={day => {
            console.log('selected day', day);
        }}
        markedDates={markedDates}
        />
</View>
  )
}


export default Streak;