import BottomSheet, { BottomSheetProps, BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useEffect, useRef } from 'react';
import { BackHandler, Keyboard, Platform } from 'react-native';

interface SafeBottomSheetProps extends Omit<BottomSheetProps, 'onChange'> {
  onChange?: (index: number) => void;
  enableBackHandler?: boolean;
  dismissKeyboardOnClose?: boolean;
}

/**
 * Safe wrapper for BottomSheet that adds crash prevention measures:
 * - Android back button handling
 * - Keyboard dismissal before closing
 * - Error boundaries
 * - Proper cleanup
 */
export const SafeBottomSheet = React.forwardRef<BottomSheet, SafeBottomSheetProps>(
  ({ onChange, enableBackHandler = true, dismissKeyboardOnClose = true, ...props }, ref) => {
    const backHandlerRef = useRef<any>(null);
    const isOpenRef = useRef(false);

    // Handle Android back button
    useEffect(() => {
      if (!enableBackHandler || Platform.OS !== 'android') {
        return;
      }

      const backAction = () => {
        if (isOpenRef.current && ref && 'current' in ref && ref.current) {
          try {
            // Dismiss keyboard first
            if (dismissKeyboardOnClose) {
              Keyboard.dismiss();
            }
            // Close the sheet
            ref.current.close();
            return true; // Prevent default back behavior
          } catch (error) {
            console.error('Error handling back button:', error);
            return false;
          }
        }
        return false;
      };

      backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => {
        if (backHandlerRef.current) {
          backHandlerRef.current.remove();
        }
      };
    }, [enableBackHandler, dismissKeyboardOnClose, ref]);

    const handleChange = (index: number) => {
      try {
        isOpenRef.current = index >= 0;
        
        // Dismiss keyboard when closing
        if (dismissKeyboardOnClose && index < 0) {
          Keyboard.dismiss();
        }

        if (onChange) {
          onChange(index);
        }
      } catch (error) {
        console.error('Error in BottomSheet onChange:', error);
      }
    };

    return (
      <BottomSheet
        ref={ref}
        {...props}
        onChange={handleChange}
        // Add safety props
        enablePanDownToClose={props.enablePanDownToClose !== false}
        enableOverDrag={false} // Disable over-drag to prevent crashes
        android_keyboardInputMode="adjustResize" // Better keyboard handling
      />
    );
  }
);

SafeBottomSheet.displayName = 'SafeBottomSheet';

// Export the view components for convenience
export { BottomSheetView, BottomSheetScrollView };

