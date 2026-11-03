import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RootState } from '@/store';

type GlassTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function GlassTabBar({ state, descriptors, emitter, navigateToTab }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors[route.key].options as typeof descriptors[string]['options'] & { href?: string | null };
    return options.href !== null;
  });

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.glassBar,
        {
          bottom: Math.max(insets.bottom, 12) + 8,
          backgroundColor: colorScheme === 'dark' ? 'rgba(28, 24, 38, 0.92)' : 'rgba(255, 255, 255, 0.88)',
          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.92)',
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const routeIndex = state.routes.findIndex((item) => item.key === route.key);
        const focused = state.index === routeIndex;
        const options = descriptors[route.key].options;
        const color = focused ? colors.primary : colorScheme === 'dark' ? '#A1A1AA' : '#908A9A';
        const label = typeof options.tabBarLabel === 'string'
          ? options.tabBarLabel
          : typeof options.title === 'string'
            ? options.title
            : route.name;

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        return (
          <HapticTab
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={[styles.tabButton, focused && { backgroundColor: colorScheme === 'dark' ? '#302342' : '#EEE8FF' }]}
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
            <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>{label}</Text>
          </HapticTab>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const HeaderRight = () => (
    <View style={{ flexDirection: 'row', marginRight: 15 }}>
      <TouchableOpacity onPress={() => console.log('Notifications')} style={{ marginRight: 15 }}>
        <IconSymbol size={24} name="bell.fill" color={Colors[colorScheme ?? 'light'].text ?? '#1F1B2D'} />
        <Badge size={16} style={{ position: 'absolute', top: -5, right: -5 }}>2</Badge>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/order/cart')}>
        <IconSymbol size={24} name="cart.fill" color={Colors[colorScheme ?? 'light'].text ?? '#1F1B2D'} />
        {cartItems.length > 0 && (
          <Badge size={16} style={{ position: 'absolute', top: -5, right: -5 }}>{cartItems.length}</Badge>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'home' : 'home-outline'} color={typeof color === 'string' ? color : '#6D28D9'} />,
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          tabBarLabel: 'Book',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons size={26} name="add" color={typeof color === 'string' ? color : '#6D28D9'} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarLabel: 'Results',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'document-text' : 'document-text-outline'} color={typeof color === 'string' ? color : '#6D28D9'} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarLabel: 'Account',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'person' : 'person-outline'} color={typeof color === 'string' ? color : '#6D28D9'} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glassBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 78,
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 6,
    borderRadius: 42,
    borderWidth: 1,
    shadowColor: '#241544',
    shadowOpacity: 0.13,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    paddingHorizontal: 3,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
