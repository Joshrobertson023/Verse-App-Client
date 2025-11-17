import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { router, Tabs, useRootNavigationState } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { Badge } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileContent from '../components/ProfileContent';
import { getOverdueVerses, getUnreadNotificationCount } from '../db';
import { defaultProfileDrawerControls, useAppStore } from '../store';
import useAppTheme from '../theme';
import { updateAppBadge } from '../utils/badgeManager';

export default function TabLayout() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const numNotifications = useAppStore((state) => state.numNotifications);
  const setNumNotifications = useAppStore((state) => state.setNumNotifications);
  const setProfileDrawerControls = useAppStore((state) => state.setProfileDrawerControls);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  const profileDrawerControls = useAppStore((state) => state.profileDrawerControls);
  const rootNavigationState = useRootNavigationState();
  const inactiveColor = theme.colors.gray;

  // Check for notifications every minute
  useEffect(() => {
    if (user.username === 'Default User') return;

    const checkNotifications = async () => {
      try {
        const count = await getUnreadNotificationCount(user.username);
        if (setNumNotifications) {
          setNumNotifications(count);
        }
        // Update badge after checking notifications
        await updateAppBadge();
      } catch (error) {
        console.error('Failed to check notifications:', error);
      }
    };

    // Check immediately
    checkNotifications();

    // Then check every minute
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, [user.username, setNumNotifications]);

  // Check for overdue verses
  useEffect(() => {
    if (user.username === 'Default User') return;

    const checkOverdue = async () => {
      try {
        const overdue = await getOverdueVerses(user.username);
        const validCollectionIds = new Set(
          collections
            .map((collection) => collection.collectionId)
            .filter((id): id is number => id !== undefined && id !== null)
        );
        const filtered = overdue.filter(
          (item) =>
            item.collectionId !== undefined &&
            item.collectionId !== null &&
            validCollectionIds.has(item.collectionId)
        );
        setOverdueCount(filtered.length);
        // Update badge after checking overdue verses
        await updateAppBadge();
      } catch (error) {
        console.error('Failed to check overdue verses:', error);
      }
    };

    // Check immediately
    checkOverdue();

    // Then check every minute
    const interval = setInterval(checkOverdue, 60000);

    return () => clearInterval(interval);
  }, [user.username, collections]);

  useEffect(() => {
    setProfileDrawerControls({
      openDrawer: () => setIsProfileDrawerOpen(true),
      closeDrawer: () => setIsProfileDrawerOpen(false),
      toggleDrawer: () => setIsProfileDrawerOpen(prev => !prev),
    });

    return () => setProfileDrawerControls(defaultProfileDrawerControls);
  }, [setProfileDrawerControls]);

  const drawerWidth = useMemo(() => Math.min(screenWidth * 0.85, 360), [screenWidth]);

React.useEffect(() => {
  if (!rootNavigationState?.key) return; // ✅ Wait until ready
  console.log('user.username: ' + user.username);
  if (user.username === 'Default User') {
    router.replace('../(auth)/createName');
  }
}, [rootNavigationState?.key, user]);

const CustomTabBar: React.FC<BottomTabBarProps> = (props) => {
  return (
    <BlurView intensity={80} 
      tint="default"
      style={{
        borderTopWidth: 0
      }}>
      <BottomTabBar {...props}
        style={{
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0
        }}
      />
    </BlurView>
  )
}

  return (
    <Drawer
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      open={isProfileDrawerOpen}
      onOpen={() => setIsProfileDrawerOpen(true)}
      onClose={() => setIsProfileDrawerOpen(false)}
      drawerPosition="right"
      drawerType="front"
      overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      drawerStyle={{ width: drawerWidth, backgroundColor: theme.colors.background }}
      renderDrawerContent={() => <ProfileContent />}
    >
    <Tabs
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray,
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 0,
          paddingVertical: 6,
          width: '100%',
        },
        tabBarIconStyle: {
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 0,
          marginLeft: 2,
        },
        tabBarLabelStyle: {
          width: '100%',
          textAlign: 'center',
          marginTop: 0,
        },
        animation: 'fade',
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomWidth: 0,
          borderBottomColor: 'transparent',
        },
        headerTitleStyle: {
          color: theme.colors.onBackground,
        },
        headerTintColor: theme.colors.onBackground,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          height: 70 + insets.bottom + 10,
          paddingBottom: Math.max(insets.bottom, 10) + 10,
          paddingTop: 10,
          paddingLeft: 5,
          paddingRight: 5,
          borderTopColor: theme.colors.surface2,
          borderTopWidth: .2,          
        },
      }}>
        <Tabs.Screen 
        name="index"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: 'Noto Serif bold', fontSize: 22, color: theme.colors.onBackground }}>
                VerseMemorization
              </Text>
              {user.isPaid && (
                <View style={{
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}>
                  <Text style={{
                    color: theme.colors.onPrimary,
                    fontSize: 12,
                    fontWeight: '700',
                    fontFamily: 'Inter',
                  }}>
                    Pro
                  </Text>
                </View>
              )}
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 15, marginRight: 10 }}>
              <TouchableOpacity onPress={() => router.push('.././notifications')}>
                <Ionicons style={{marginTop: 4}} name="notifications-outline" size={32} color={theme.colors.onBackground} />
                {numNotifications > 0 && (
                <Badge
                  size={18}
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    backgroundColor: 'red',
                    color: 'white',
                    fontSize: 12,
                  }}
                >
                  {useAppStore.getState().numNotifications}
                </Badge>
              )}
              </TouchableOpacity>
              <Pressable onPress={() => profileDrawerControls.toggleDrawer()}>
                <Ionicons style={{marginTop: 4}} name="person-circle" size={32} color={theme.colors.onBackground} />
              </Pressable>
            </View>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ marginLeft: 0 }}>
              <Ionicons 
                name={focused ? 'home' : 'home-outline'} 
                color={focused ? theme.colors.primary : inactiveColor} 
                size={28} 
              />
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: focused ? theme.colors.primary : inactiveColor,
                marginTop: 0,
                textAlign: 'center',
              }}
            > Home
            </Text>
          ),
        }}
      />
          <Tabs.Screen 
        name="practice" 
        options={{
          title: 'Practice',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={{ position: 'relative', marginLeft: 0 }}>
              <Ionicons 
                name={focused ? 'extension-puzzle' : 'extension-puzzle-outline'} 
                color={focused ? theme.colors.primary : inactiveColor} 
                size={28} 
              />
              {overdueCount > 0 && (
                <Badge
                  size={18}
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    backgroundColor: 'red',
                    color: 'white',
                    fontSize: 12,
                  }}
                >
                  {overdueCount}
                </Badge>
              )}
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: focused ? theme.colors.primary : inactiveColor,
                marginTop: 0,
                textAlign: 'center',
              }}
            > Practice
            </Text>
          ),
        }}
      />
          <Tabs.Screen 
            name="search" 
            options={{
              headerShown: false,
              tabBarIcon: ({ focused }) => (
                <View style={{
                    zIndex: 1000000,
                    height: 67,
                    width: 67,
                    padding: 10,
                    borderRadius: 100,
                    marginBottom: -10,
                    backgroundColor: focused ? theme.colors.surface : theme.colors.background
                }}>
                  <Ionicons 
                    name={'search-outline'} 
                    color={focused ? theme.colors.primary : inactiveColor} 
                    size={45} 
                  />
                </View>
              ),
              tabBarLabel: ({ focused }) => (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: focused ? '800' : '400',
                    color: 'transparent',
                    marginTop: 0,
                    textAlign: 'center',
                    position: 'absolute',
                    zIndex: 0,
                  }}
                > Search
                </Text>
              ),
        }}
      />
      <Tabs.Screen
        name="bible"
        
        options={{
          title: 'Bible',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={{ marginLeft: 0 }}>
              <Ionicons 
                name={focused ? 'book-sharp' : 'book-outline'} 
                color={focused ? theme.colors.primary : inactiveColor} 
                size={28}
              />
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: focused ? theme.colors.primary : inactiveColor,
                marginTop: 0,
                textAlign: 'center',
              }}
            > Bible
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={{ marginLeft: 0 }}>
              <Ionicons 
                name={focused ? 'planet' : 'planet-outline'} 
                color={focused ? theme.colors.primary : inactiveColor} 
                size={28}
              />
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: focused ? theme.colors.primary : inactiveColor,
                marginTop: 0,
                textAlign: 'center',
              }}
            > Explore
            </Text>
          ),
        }}
      />
    </Tabs>
    </Drawer>
  );
}