import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Animated, Dimensions, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { MarkedDates } from 'react-native-calendars/src/types';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import { useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const Streak = () => {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const today = new Date();
  const [currentDate, setCurrentDate] = React.useState(today);
  const streak = useAppStore((state) => state.user.streak);
  const [streakLength, setStreakLength] = React.useState(0);
  const [streakMessage, setStreakMessage] = React.useState('');
  const [isAnimating, setIsAnimating] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const dragX = React.useRef(new Animated.Value(0)).current;
  const dragOffset = React.useRef(0);
  const screenWidth = Dimensions.get('window').width;

  // Format date for calendar (YYYY-MM-DD)
  const formatDateForCalendar = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Pan gesture handler for drag response
  const panGesture = Gesture.Pan()
    .activeOffsetX([-5, 5]) // Only activate for horizontal drags
    .failOffsetY([-10, 10]) // Fail if vertical movement is too much
    .onUpdate((event) => {
      // Update drag position in real-time, limit the drag distance
      const maxDrag = screenWidth * 0.25; // Limit to 25% of screen width
      const clampedX = Math.max(-maxDrag, Math.min(maxDrag, event.translationX));
      dragX.setValue(clampedX);
    })
    .onEnd((event) => {
      // Reset drag position when gesture ends with spring animation
      dragOffset.current = 0;
      Animated.spring(dragX, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    });

  // Animate calendar on month change
  const animateMonthChange = (direction: 'left' | 'right') => {
    if (isAnimating) return; // Prevent overlapping animations
    
    setIsAnimating(true);
    const slideDistance = direction === 'left' ? -30 : 30;
    
    // Reset animations
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
    dragX.setValue(0);
    
    Animated.parallel([
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: slideDistance,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setIsAnimating(false);
    });
  };

  const streakMessages = [ // Increments every three days 
      "Keep up the good work!", // days 1-2
      "Awesome! Let's keep the momentum going!", // days 3-5
      "Fantastic! You're on a roll!", // days 6-8
      "Fantastic! You're on a roll!", // days 6-8
      "Incredible! Your dedication is inspiring!",
      "Incredible! Your dedication is inspiring!",
      "Keep up the good work!", // days 1-2
      "Awesome! Let's keep the momentum going!", // days 3-5 
        "Amazing! By now you must have memorized half the Bible!",
        "A month?! Keep it up!", // Should always stay at index 10 (#11)
        "Amazing! By now you must have memorized half the Bible!",
        "Amazing! By now you must have memorized half the Bible!",
        "Amazing! By now you must have memorized half the Bible!",
      "Incredible! Your dedication is inspiring!",
      "Incredible! Your dedication is inspiring!",
      "Incredible! Your dedication is inspiring!",
      "Incredible! Your dedication is inspiring!",
      "Incredible! Your dedication is inspiring!",
      "Incredible! Your dedication is inspiring!",
      "Must be nice to be able to recite Psalms from memory!",
      "Must be nice to be able to recite Psalms from memory!",
      "Must be nice to be able to recite Psalms from memory!",
      "Must be nice to be able to recite Psalms from memory!",
      "Must be nice to be able to recite Psalms from memory!",
      "Must be nice to be able to recite Psalms from memory!",
      "Do you have the whole Bible memorized now?",
      "Do you have the whole Bible memorized now?",
      "Do you have the whole Bible memorized now?",
      "Do you have the whole Bible memorized now?",
      "Do you have the whole Bible memorized now?",
      "Do you have the whole Bible memorized now?",
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

  React.useEffect(() => {
    setStreakLength(user.streakLength || 0);
    // Assign streak message based on streak length
    if ((user.streakLength || 0) === 0) {
        setStreakMessage("No current streak. Let's start one today!");
        return;
    } else {
        setStreakMessage(streakMessages[Math.floor((user.streakLength || 0) / 3)]);
    }
  }, [user.streakLength]);

  return (    
    <View style={{flex: 1, justifyContent: 'center'}}>
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}> 
        <Ionicons style={{marginTop: 10, marginBottom: 5}} name="flame" size={48} color={theme.colors.onBackground} />
        <Text style={{fontSize: 48, color: theme.colors.onBackground, fontWeight: 'bold'}}>{streakLength}</Text>
        <Text style={{fontSize: 24, color: theme.colors.onBackground}}>Day Streak</Text>
        <Text style={{fontSize: 14, color: theme.colors.onBackground, marginTop: 10}}>{streakMessage ? streakMessage : "At this point I think nothing can stop you..."}</Text>
    </View>
        <View style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
          {/* Left gradient overlay */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 30,
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <LinearGradient
              colors={[theme.colors.background, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </View>

          {/* Right gradient overlay */}
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 30,
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <LinearGradient
              colors={['transparent', theme.colors.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </View>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [
                  { translateX: Animated.add(slideAnim, dragX) },
                ],
              }}
            >
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
                  todayTextColor: theme.colors.tertiary,
                  dayTextColor: theme.colors.onBackground,
                  textDisabledColor: theme.colors.secondary,
                  dotColor: theme.colors.primary,
                  selectedDotColor: theme.colors.onBackground,
                  arrowColor: theme.colors.onBackground,
                  monthTextColor: theme.colors.onBackground,
                  indicatorColor: theme.colors.onBackground,
                }}
                current={formatDateForCalendar(currentDate)}
                onDayPress={day => {
                  console.log('selected day', day);
                }}
                onMonthChange={(month) => {
                  const newDate = new Date(month.year, month.month - 1, 1);
                  const oldDate = currentDate;
                  
                  // Only animate if the month actually changed
                  if (newDate.getTime() !== oldDate.getTime()) {
                    // Determine swipe direction based on date comparison
                    const direction = newDate > oldDate ? 'right' : 'left';
                    animateMonthChange(direction);
                    setCurrentDate(newDate);
                  }
                }}
                markedDates={markedDates}
                enableSwipeMonths={true}
                hideExtraDays={false}
                />
            </Animated.View>
          </GestureDetector>
        </View>
</View>
  )
}


export default Streak;