import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { messageService } from '@/core/services/messageService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const user = useSessionStore((s) => s.user);
  const unreadQuery = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: () => messageService.getUnreadCount(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const unread = unreadQuery.data ?? 0;
  const messagesBadge: string | number | undefined =
    user && unread > 0 ? (unread > 99 ? '99+' : unread) : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" color={color} size={size ?? 26} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="work" color={color} size={size ?? 26} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: messagesBadge,
          tabBarIcon: ({ color, size }) => <MaterialIcons name="chat-bubble" color={color} size={size ?? 26} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="account-balance-wallet" color={color} size={size ?? 26} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" color={color} size={size ?? 26} />,
        }}
      />
    </Tabs>
  );
}
