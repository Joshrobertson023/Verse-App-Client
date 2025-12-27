import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface CollectionDonutProps {
  averageProgressPercent?: number;
  size?: number;
}

export default function CollectionDonut({ averageProgressPercent = 0, size = 50 }: CollectionDonutProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  
  // Clamp progress between 0 and 100
  const progressPercent = Math.min(100, Math.max(0, averageProgressPercent));
  
  const radius = size / 2;
  const strokeWidth = 6;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;
  
  // Calculate the offset for the green (memorized) portion
  const greenLength = (progressPercent / 100) * circumference;
  const redLength = circumference - greenLength;
  
  // Start from top (-90 degrees rotation)
  const rotation = -90;
  
  // Colors: Green for memorized, Red for not memorized
  const greenColor = '#4CAF50'; // Green
  const redColor = '#959595ff'; // Red
  
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
          <Text style={[styles.tinyText, { fontSize: 9, fontWeight: '600', color: theme.colors.onBackground }]}>
            {Math.round(progressPercent)}%
          </Text>
        </View>
      </View>
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














