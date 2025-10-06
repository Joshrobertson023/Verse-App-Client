import React from 'react';
import { View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Text } from 'react-native-paper';
import getStyles from '../styles';
import useAppTheme from '../theme';

const Streak = () => {
  const styles = getStyles();
  const theme = useAppTheme();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date();
  const dayNumber = date.getDay();

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
        current={'2012-03-01'}
        onDayPress={day => {
            console.log('selected day', day);
        }}
        markedDates={{
            '2012-03-01': {selected: true, selectedColor: 'green'},
            '2012-03-02': {selected: true, selectedColor: 'red'},
            '2012-03-03': {selected: true, selectedColor: 'green'}
        }}
        />
</View>
  )
}

export default Streak;