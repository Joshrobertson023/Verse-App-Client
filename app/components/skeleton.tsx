import React, { useEffect } from 'react';
import { Animated, View } from 'react-native';
import useAppTheme from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = ({ width, height = 20, borderRadius = 8, style }: SkeletonProps) => {
  const theme = useAppTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width || '100%',
          height,
          borderRadius,
          backgroundColor: theme.colors.surface,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Profile skeleton for loading user profiles
export const ProfileSkeleton = () => {
  const theme = useAppTheme();
  
  return (
    <View style={{ padding: 20, backgroundColor: theme.colors.background }}>
      {/* Profile Picture and Name */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
        <Skeleton width={70} height={70} borderRadius={35} />
        <View style={{ marginLeft: 15, flex: 1 }}>
          <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={16} />
        </View>
      </View>

      {/* Description */}
      <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 20 }} />

      {/* Stats Row */}
      <View style={{ flexDirection: 'row', marginBottom: 30, gap: 20 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={120} borderRadius={12} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={120} borderRadius={12} />
        </View>
      </View>

      {/* Collections */}
      <Skeleton width="40%" height={20} style={{ marginBottom: 15 }} />
      {[1, 2].map((i) => (
        <Skeleton key={i} width="100%" height={80} borderRadius={12} style={{ marginBottom: 10 }} />
      ))}
    </View>
  );
};

// Collection item skeleton
export const CollectionItemSkeleton = () => {
  const theme = useAppTheme();
  
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
    }}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Skeleton width="70%" height={22} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={16} style={{ marginBottom: 20 }} />
        <Skeleton width="40%" height={14} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <Skeleton width={60} height={14} style={{ marginTop: 40 }} />
      </View>
    </View>
  );
};

// Verse/passage skeleton for practice screen
export const VerseItemSkeleton = () => {
  const theme = useAppTheme();
  
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <View style={{ flex: 1 }}>
        <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={16} />
      </View>
      <Skeleton width={24} height={24} borderRadius={4} />
    </View>
  );
};

// Search result skeleton
export const SearchResultSkeleton = () => {
  const theme = useAppTheme();
  
  return (
    <View style={{
      padding: 16,
      marginBottom: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
    }}>
      <Skeleton width="30%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={16} style={{ marginBottom: 4 }} />
      <Skeleton width="90%" height={16} />
    </View>
  );
};

// Collection content skeleton (for loading verses in a collection)
export const CollectionContentSkeleton = () => {
  return (
    <View style={{ padding: 20, width: '100%' }}>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} width="100%" height={100} borderRadius={12} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
};

// Friend item skeleton
export const FriendItemSkeleton = () => {
  const theme = useAppTheme();
  
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={14} />
      </View>
      <Skeleton width={24} height={24} borderRadius={4} />
    </View>
  );
};

