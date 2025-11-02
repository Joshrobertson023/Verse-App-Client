import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getPracticeHistory } from '../../db';
import useStyles from '../../styles';
import useAppTheme from '../../theme';

export default function FriendStreakCalendarScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [practiceDates, setPracticeDates] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [totalPractices, setTotalPractices] = useState(0);

  useEffect(() => {
    loadPracticeHistory();
  }, [selectedMonth]);

  const loadPracticeHistory = async () => {
    try {
      const history = await getPracticeHistory(username);
      const dateSet = new Set(
        history.map(dateString => {
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })
      );
      console.log('Practice dates loaded:', Array.from(dateSet));
      setPracticeDates(dateSet);
      setTotalPractices(dateSet.size);
    } catch (error) {
      console.error('Failed to load practice history:', error);
      setPracticeDates(new Set());
      setTotalPractices(0);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const formatDateKey = (day: number) => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDatePracticed = (day: number | null) => {
    if (day === null) return false;
    const dateKey = formatDateKey(day);
    return practiceDates.has(dateKey);
  };

  const isToday = (day: number | null) => {
    if (day === null) return false;
    const today = new Date();
    return selectedMonth.getFullYear() === today.getFullYear() &&
           selectedMonth.getMonth() === today.getMonth() &&
           day === today.getDate();
  };

  const goToPreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);
    if (nextMonth <= now) {
      setSelectedMonth(nextMonth);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(selectedMonth);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Streak Calendar',
          headerBackVisible: true,
        }}
      />
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ padding: 20 }}>
          {/* Current Streak Display */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            alignItems: 'center'
          }}>
            <Ionicons name="flame" size={48} color="#FF6B35" />
            <Text style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: theme.colors.onBackground,
              marginTop: 12,
              fontFamily: 'Inter'
            }}>
              {totalPractices}
            </Text>
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter'
            }}>
              Total Practice Days
            </Text>
          </View>

          {/* Calendar */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 16
          }}>
            {/* Month Navigation */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <TouchableOpacity onPress={goToPreviousMonth}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.onBackground} />
              </TouchableOpacity>
              
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: theme.colors.onBackground,
                fontFamily: 'Inter'
              }}>
                {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </Text>
              
              <TouchableOpacity 
                onPress={goToNextMonth}
                disabled={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1) > new Date()}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1) > new Date() ? theme.colors.onSurfaceVariant : theme.colors.onBackground} 
                />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {dayNames.map(day => (
                <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter'
                  }}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {days.map((day, index) => (
                <View key={index} style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}>
                  {day !== null ? (
                    <View style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 8,
                      backgroundColor: isDatePracticed(day) ? '#4CAF50' : 
                                       isToday(day) ? theme.colors.surface : 
                                       'transparent',
                      borderWidth: isToday(day) ? 3 : 0,
                      borderColor: theme.colors.primary,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: isDatePracticed(day) ? '600' : '400',
                        color: isDatePracticed(day) ? '#FFFFFF' : theme.colors.onBackground,
                        fontFamily: 'Inter'
                      }}>
                        {day}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ width: '100%', height: '100%' }} />
                  )}
                </View>
              ))}
            </View>

            {/* Legend */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 16,
              gap: 16,
              flexWrap: 'wrap'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: '#4CAF50',
                  marginRight: 8
                }} />
                <Text style={{
                  fontSize: 12,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  Practiced
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  borderWidth: 3,
                  borderColor: theme.colors.primary,
                  marginRight: 8
                }} />
                <Text style={{
                  fontSize: 12,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  Today
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: theme.colors.onSurfaceVariant,
                  marginRight: 8
                }} />
                <Text style={{
                  fontSize: 12,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  No practice
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

