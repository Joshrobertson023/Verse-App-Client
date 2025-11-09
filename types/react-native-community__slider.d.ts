declare module '@react-native-community/slider' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface SliderProps extends ViewProps {
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    value?: number;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
    disabled?: boolean;
    onSlidingComplete?: (value: number) => void;
    onSlidingStart?: (value: number) => void;
    onValueChange?: (value: number) => void;
    tapToSeek?: boolean;
    inverted?: boolean;
  }

  export default class Slider extends Component<SliderProps> {}
}

