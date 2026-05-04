import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useSession } from '../../src/session';
import { Redirect } from 'expo-router';

export default function HeroLayout() {
  const { profile } = useSession();
  if (!profile) return <Redirect href="/" />;
  if (profile.role === 'boss') return <Redirect href="/boss/approvals" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.parchmentDeep,
        tabBarStyle: {
          backgroundColor: colors.burgundyDark,
          borderTopWidth: 2,
          borderTopColor: colors.primary,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Hero', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="shield-crown" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="quests"
        options={{ title: 'Quests', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="script-text" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="wheel"
        options={{ title: 'Fate', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="compass-rose" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'Ranks', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="podium" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="locker"
        options={{ title: 'Locker', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="treasure-chest" size={24} color={color} /> }}
      />
    </Tabs>
  );
}
