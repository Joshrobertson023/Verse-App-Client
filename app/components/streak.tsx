import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { MarkedDates } from 'react-native-calendars/src/types';
import { Text } from 'react-native-paper';
import { useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const Streak = () => {
  const styles = useStyles();
  const theme = useAppTheme();
  const date = new Date();
  const streak = useAppStore((state) => state.streak);
  const [streakLength, setStreakLength] = React.useState(0);
  const [streakMessage, setStreakMessage] = React.useState('');

  const streakMessages = [ // Increments every three days 
      "Keep up the good work!", // days 1-2
      "Awesome! Let's keep the momentum going!", // days 3-5 
      "Fantastic! You're on a roll!", // days 6-8
      "Incredible! Your dedication is inspiring!",
      "Phenomenal! You're setting a great example!",
      "Unstoppable! Nothing can break your streak now!",
      "Legendary! You're a memorization master!",
        "Mythical! Your streak is the stuff of legends!",
        "Immortal! Your dedication knows no bounds!",
        "Eternal! Your streak will be remembered forever!",
        "A month?! Keep it going!",
]

  const markedDates = React.useMemo(() => {
    const markings: MarkedDates = {};

    streak?.forEach((streakDay) => {
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
  
  const currentStreakLength = React.useMemo(() => {
    return 0;
  }, [streak]);

  React.useEffect(() => {
    setStreakLength(currentStreakLength);
    // Assign streak message based on streak length
    if (currentStreakLength === 0) {
        setStreakMessage("No current streak. Let's start one today!");
        return;
    } else {
        setStreakMessage(streakMessages[Math.floor(currentStreakLength / 3)]);
    }
  }, [currentStreakLength]);

  return (    
    <View style={{flex: 1, justifyContent: 'center'}}>
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}> 
        <Ionicons style={{marginTop: 10, marginBottom: 5}} name="flame" size={48} color={theme.colors.onBackground} />
        <Text style={{fontSize: 48, color: theme.colors.onBackground, fontWeight: 'bold'}}>{streakLength}</Text>
        <Text style={{fontSize: 24, color: theme.colors.onBackground}}>Day Streak</Text>
        <Text style={{fontSize: 14, color: theme.colors.onBackground, marginTop: 10}}>{streakMessage ? streakMessage : "At this point I think nothing can stop you..."}</Text>
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
                todayTextColor: theme.colors.background,
                dayTextColor: theme.colors.onBackground,
                textDisabledColor: theme.colors.secondary,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.onBackground,
                arrowColor: theme.colors.onBackground,
                monthTextColor: theme.colors.onBackground,
                indicatorColor: theme.colors.onBackground,
            }}
        current={date.toString()}
        onDayPress={day => {
            console.log('selected day', day);
        }}
        markedDates={markedDates}
        />
</View>
  )
}


export default Streak;