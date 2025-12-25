import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface UserVerseDonutProps {
  userVerse: UserVerse;
  size?: number;
  nextPracticeDate?: Date | null;
  showDaysUntilDue?: boolean;
}

export default function UserVerseDonut({ userVerse, size = 60, nextPracticeDate, showDaysUntilDue = true }: UserVerseDonutProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  
  // Check if never practiced
  const hasNeverPracticed = !userVerse.lastPracticed || (userVerse.timesMemorized || 0) === 0;
  
  // Get memorization progress (0-100)
  const progressPercent = userVerse.progressPercent ?? 0;
  const memorizedPercent = Math.min(100, Math.max(0, progressPercent));
  
  const radius = size / 2;
  const strokeWidth = 6;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;
  
  // Calculate the offset for the green (memorized) portion
  // We want green to start from the top, so we need to calculate the dash offset
  // The green portion should be: memorizedPercent% of the circle
  const greenLength = (memorizedPercent / 100) * circumference;
  const redLength = circumference - greenLength;
  
  // Start from top (-90 degrees rotation)
  const rotation = -90;
  
  if (hasNeverPracticed) {
    // Show gray donut for never practiced
    return (
      <View style={donutStyles.container}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: `${rotation}deg` }] }}>
            <Circle
              cx={radius}
              cy={radius}
              r={innerRadius}
              stroke={theme.colors.onSurfaceVariant || '#9E9E9E'}
              strokeWidth={strokeWidth}
              fill="transparent"
              opacity={0.5}
            />
          </Svg>
          <View style={donutStyles.centerText}>
            <Text style={[styles.tinyText, { fontSize: 9, fontWeight: '600', color: theme.colors.onBackground }]}>
              0%
            </Text>
          </View>
        </View>
      </View>
    );
  }
  
  const greenColor = '#4CAF50';
  const redColor = '#9E9E9E';
  
  return (
    <View style={donutStyles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: `${rotation}deg` }] }}>
          {/* Red background circle (full circle for not memorized portion) */}
          <Circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            stroke={redColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Green progress circle (memorized portion) */}
          {greenLength > 0 && (
            <Circle
              cx={radius}
              cy={radius}
              r={innerRadius}
              stroke={greenColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${greenLength} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
          )}
        </Svg>
        
        {/* Center text - show progress percentage or checkmark */}
        <View style={donutStyles.centerText}>
          <Text style={[{ fontSize: 22, fontWeight: '600', color: theme.colors.onBackground }]}>
            {Math.round(memorizedPercent)}%
          </Text>
        </View>
      </View>
      
      {/* Days until due - shown underneath the donut */}
      {showDaysUntilDue && nextPracticeDate && (() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const nextDate = new Date(nextPracticeDate);
        nextDate.setHours(0, 0, 0, 0);
        const diffTime = nextDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          return (
            <Text style={[styles.tinyText, { fontSize: 10, color: redColor, marginTop: 4, fontWeight: '600' }]}>
              {Math.abs(diffDays)}d overdue
            </Text>
          );
        } else if (diffDays === 0) {
          return (
            <Text style={[styles.tinyText, { fontSize: 10, color: theme.colors.onSurfaceVariant, marginTop: 4, fontWeight: '600' }]}>
              Due today
            </Text>
          );
        } else {
          return (
            <Text style={[styles.tinyText, { fontSize: 10, color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
              {diffDays}d
            </Text>
          );
        }
      })()}
    </View>
  );
}

const donutStyles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
    centerText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});

