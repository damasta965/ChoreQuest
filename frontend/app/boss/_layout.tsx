import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useSession } from '../../src/session';

export default function BossLayout() {
  const { profile } = useSession();
  if (!profile) return <Redirect href="/" />;
  if (profile.role !== 'boss') return <Redirect href="/hero/dashboard" />;
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
      <Tabs.Screen name="approvals" options={{ title: 'Approvals', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="gavel" size={24} color={color} /> }} />
      <Tabs.Screen name="manage" options={{ title: 'Quests', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="script-text-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="payouts" options={{ title: 'Payouts', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="treasure-chest" size={24} color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Realm', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="castle" size={24} color={color} /> }} />
    </Tabs>
  );
}
