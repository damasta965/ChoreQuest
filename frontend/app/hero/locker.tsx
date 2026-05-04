import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSession } from '../../src/session';
import { api } from '../../src/api';
import { colors, AVATAR_ASSETS } from '../../src/theme';
import { HeaderBanner, Parchment, SectionTitle, GoldButton, StoneCard } from '../../src/ui';

const SLOTS = ['weapon', 'shield', 'helmet', 'cape'] as const;
type Slot = (typeof SLOTS)[number];

export default function Locker() {
  const { profile, refresh } = useSession();

  useFocusEffect(useCallback(() => { refresh(); }, []));

  if (!profile) return null;

  const changeAvatar = async (cls: string) => {
    try {
      await api.updateProfile(profile.id, { avatar_class: cls });
      await refresh();
    } catch (e: any) { Alert.alert('Error', e?.message); }
  };

  const equipGear = async (gearId: string, slot: Slot) => {
    const next = { ...profile.equipped_gear, [slot]: profile.equipped_gear[slot] === gearId ? null : gearId };
    try {
      await api.updateProfile(profile.id, { equipped_gear: next });
      await refresh();
    } catch (e: any) { Alert.alert('Error', e?.message); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Armory & Locker" subtitle="Forge thy legend" />
      <ScrollView contentContainerStyle={styles.container}>
        <SectionTitle icon="account-convert">Choose Thy Class</SectionTitle>
        <View style={styles.classGrid}>
          {Object.entries(AVATAR_ASSETS).map(([key, a]) => {
            const active = profile.avatar_class === key;
            return (
              <Pressable
                key={key}
                testID={`class-${key}`}
                onPress={() => changeAvatar(key)}
                style={[styles.classCard, active && { borderColor: colors.primary, borderWidth: 3 }]}
              >
                <View style={[styles.classAvatar, { borderColor: a.color }]}>
                  <Text style={{ fontSize: 32 }}>{a.emoji}</Text>
                </View>
                <Text style={styles.className}>{a.label}</Text>
                <Text style={styles.classTag}>{a.tagline}</Text>
                {active && <View style={styles.equippedDot}><MaterialCommunityIcons name="check" size={12} color="#000" /></View>}
              </Pressable>
            );
          })}
        </View>

        {SLOTS.map((slot) => {
          const gear = profile.unlocked_gear.filter((g) => g.slot === slot);
          const allGear = [
            ...gear,
          ];
          return (
            <View key={slot}>
              <SectionTitle icon={SLOT_ICON[slot]}>{SLOT_LABEL[slot]}</SectionTitle>
              {allGear.length === 0 ? (
                <StoneCard><Text style={styles.empty}>Unlock {slot}s by leveling up!</Text></StoneCard>
              ) : (
                <View style={styles.gearGrid}>
                  {allGear.map((g) => {
                    const equipped = profile.equipped_gear[slot] === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        testID={`gear-${g.id}`}
                        onPress={() => equipGear(g.id, slot)}
                        style={[styles.gearCard, equipped && { borderColor: colors.primary, borderWidth: 3 }]}
                      >
                        <MaterialCommunityIcons name={g.icon as any} size={28} color={colors.primary} />
                        <Text style={styles.gearName}>{g.name}</Text>
                        <Text style={styles.gearLv}>Lv {g.level}</Text>
                        {equipped && <Text style={styles.equippedText}>EQUIPPED</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const SLOT_LABEL: Record<Slot, string> = { weapon: 'Weapons', shield: 'Shields', helmet: 'Helmets', cape: 'Capes' };
const SLOT_ICON: Record<Slot, string> = { weapon: 'sword', shield: 'shield', helmet: 'crown-outline', cape: 'tshirt-crew' };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 14, paddingBottom: 40 },
  classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  classCard: {
    width: '48%',
    backgroundColor: colors.parchment,
    borderWidth: 2, borderColor: colors.primaryDark,
    borderRadius: 10, padding: 12,
    alignItems: 'center',
  },
  classAvatar: { width: 64, height: 64, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  className: { color: colors.ink, fontSize: 15, fontWeight: '900', fontFamily: 'Georgia', marginTop: 6 },
  classTag: { color: colors.inkMuted, fontSize: 10, fontStyle: 'italic' },
  equippedDot: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  gearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  gearCard: {
    width: '31%',
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.stoneLight,
    borderRadius: 8, padding: 10,
    alignItems: 'center',
  },
  gearName: { color: colors.parchment, fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  gearLv: { color: colors.inkMuted, fontSize: 10, marginTop: 2 },
  equippedText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
  empty: { color: colors.inkMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 4 },
});
