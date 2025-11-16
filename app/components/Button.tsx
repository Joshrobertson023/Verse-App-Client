import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import useStyles from '../styles';
import useAppTheme from '../theme';

type ButtonVariant = 'outlined' | 'filled' | 'text';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  textStyle?: any;
}

export default function Button({ 
  title, 
  onPress, 
  variant = 'filled', 
  disabled = false,
  loading = false,
  style,
  textStyle
}: ButtonProps) {
  const styles = useStyles();
  const theme = useAppTheme();

  const getButtonStyle = () => {
    switch (variant) {
      case 'outlined':
        return [styles.buttonOutlined, style];
      case 'text':
        return [styles.buttonText, style];
      case 'filled':
      default:
        return [styles.buttonFilled, style];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outlined':
        return [{ color: theme.colors.onBackground, fontSize: 16, fontWeight: '600', fontFamily: 'Inter' }, textStyle];
      case 'text':
        return [{ color: theme.colors.onBackground, fontSize: 16, fontFamily: 'Inter' }, textStyle];
      case 'filled':
      default:
        return [{ color: theme.colors.background, fontSize: 16, fontFamily: 'Inter' }, textStyle];
    }
  };

  const getIndicatorColor = () => {
    switch (variant) {
      case 'filled':
        return theme.colors.background;
      default:
        return theme.colors.onBackground;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        getButtonStyle(),
        pressed && { opacity: 0.8 },
        (disabled || loading) && { opacity: 0.5 }
      ]}
    >
      {loading ? (
        <ActivityIndicator animating={true} color={getIndicatorColor()} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </Pressable>
  );
}

