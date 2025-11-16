import { BottomSheet } from '@gorhom/bottom-sheet';
import { Keyboard } from 'react-native';

/**
 * Safely closes a bottom sheet with error handling and keyboard dismissal
 */
export async function safeCloseBottomSheet(
  sheetRef: React.RefObject<BottomSheet>,
  onComplete?: () => void
): Promise<void> {
  try {
    // Dismiss keyboard first to prevent crashes
    Keyboard.dismiss();
    
    // Small delay to ensure keyboard is dismissed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (sheetRef.current) {
      sheetRef.current.close();
      
      // Call completion callback after a short delay
      if (onComplete) {
        setTimeout(() => {
          try {
            onComplete();
          } catch (error) {
            console.error('Error in bottom sheet close callback:', error);
          }
        }, 200);
      }
    }
  } catch (error) {
    console.error('Error closing bottom sheet:', error);
    // Still try to call completion callback
    if (onComplete) {
      try {
        onComplete();
      } catch (callbackError) {
        console.error('Error in bottom sheet close callback:', callbackError);
      }
    }
  }
}

/**
 * Safely expands a bottom sheet
 */
export function safeExpandBottomSheet(sheetRef: React.RefObject<BottomSheet>): void {
  try {
    if (sheetRef.current) {
      sheetRef.current.expand();
    }
  } catch (error) {
    console.error('Error expanding bottom sheet:', error);
  }
}

/**
 * Safely snaps a bottom sheet to a specific index
 */
export function safeSnapToIndex(sheetRef: React.RefObject<BottomSheet>, index: number): void {
  try {
    if (sheetRef.current) {
      sheetRef.current.snapToIndex(index);
    }
  } catch (error) {
    console.error('Error snapping bottom sheet to index:', error);
  }
}

