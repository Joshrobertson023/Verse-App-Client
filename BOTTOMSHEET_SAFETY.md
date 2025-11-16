# Bottom Sheet & Gesture Handler Safety Guide

## ✅ Already Implemented

1. **GestureHandlerRootView** - Properly wrapped in `_layout.tsx`
2. **Gesture Handler Import** - At the top of `_layout.tsx` ✅
3. **Reanimated Babel Plugin** - Correctly configured (last in plugins) ✅

## 🛡️ Safety Measures Added

### 1. SafeBottomSheet Component
Created `app/components/SafeBottomSheet.tsx` with:
- Android back button handling
- Automatic keyboard dismissal
- Error handling
- Proper cleanup

### 2. Helper Utilities
Created `app/utils/bottomSheetHelpers.ts` with:
- `safeCloseBottomSheet()` - Safely closes sheets with keyboard dismissal
- `safeExpandBottomSheet()` - Safely expands sheets
- `safeSnapToIndex()` - Safely snaps to index

### 3. Error Boundary
Created `app/components/ErrorBoundary.tsx` to catch crashes

## 📋 Best Practices for Existing BottomSheet Usage

### Current Issues Found:

1. **Missing `android_keyboardInputMode` prop`**
   - Add: `android_keyboardInputMode="adjustResize"`

2. **Missing error handling in onChange**
   - Wrap onChange handlers in try-catch

3. **No keyboard dismissal before closing**
   - Use `safeCloseBottomSheet()` helper

4. **No Android back button handling**
   - Use `SafeBottomSheet` component or add manually

## 🔧 Quick Fixes for Existing Code

### Option 1: Use SafeBottomSheet (Recommended)
Replace:
```tsx
import BottomSheet from '@gorhom/bottom-sheet';
```
With:
```tsx
import { SafeBottomSheet } from '../components/SafeBottomSheet';
```

### Option 2: Add Safety Props to Existing BottomSheet
Add these props to all BottomSheet instances:
```tsx
<BottomSheet
  // ... existing props
  enableOverDrag={false}  // Prevents over-drag crashes
  android_keyboardInputMode="adjustResize"  // Better keyboard handling
  keyboardBehavior="interactive"  // Better keyboard interaction
  keyboardBlurBehavior="restore"  // Restore on blur
/>
```

### Option 3: Use Helper Functions
Replace direct sheet operations:
```tsx
// Instead of:
sheetRef.current?.close();

// Use:
import { safeCloseBottomSheet } from '../utils/bottomSheetHelpers';
safeCloseBottomSheet(sheetRef, () => {
  // Optional callback after close
});
```

## 🚨 Critical Safety Props

Always include these props on BottomSheet:
- `enablePanDownToClose={true}` (default, but be explicit)
- `enableOverDrag={false}` (prevents crashes from over-dragging)
- `android_keyboardInputMode="adjustResize"` (prevents keyboard crashes)
- `keyboardBehavior="interactive"` (better keyboard handling)

## 📝 Migration Checklist

- [ ] Replace BottomSheet imports with SafeBottomSheet where possible
- [ ] Add `android_keyboardInputMode="adjustResize"` to all BottomSheet instances
- [ ] Add `enableOverDrag={false}` to all BottomSheet instances
- [ ] Wrap sheet close operations with `safeCloseBottomSheet()`
- [ ] Add try-catch to all onChange handlers
- [ ] Test Android back button behavior
- [ ] Test keyboard dismissal before closing sheets

## 🔍 Testing

After implementing these changes:
1. Test on physical Android device
2. Test with keyboard open/close scenarios
3. Test Android back button while sheet is open
4. Test rapid open/close operations
5. Test with multiple sheets open

