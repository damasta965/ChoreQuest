import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, Profile } from '../src/api';
import { colors, AVATAR_ASSETS, RANK_COLORS } from '../src/theme';
import { AvatarView } from '../src/AvatarView';
import { useSession } from '../src/session';

export default function ProfileSelect() {
  const router = useRouter();
  const { logout } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listProfiles();
      setProfiles(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      logout();
      load();
    }, [logout, load])
  );

  useEffect(() => {
    load();
  }, [load]);

  const kids = profiles.filter((p) => p.role === 'kid');
  const boss = profiles.find((p) => p.role === 'boss');

  const openPin = (p: Profile) => {
    router.push({ pathname: '/pin', params: { profileId: p.id, name: p.name, role: p.role } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="castle" size={36} color={colors.primary} />
          <Text style={styles.title} testID="app-title">CHORE QUEST</Text>
          <Text style={styles.subtitle}>A Realm of Duty & Glory</Text>
          <View style={styles.divider} />
          <Text style={styles.prompt}>Choose thy hero, brave soul</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {kids.map((p) => (
              <HeroCard key={p.id} profile={p} onPress={() => openPin(p)} />
            ))}
            {boss ? <BossCard profile={boss} onPress={() => openPin(boss)} /> : null}
          </>
        )}

        <Text style={styles.footer}>⚔ Forged in the halls of valor ⚔</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroCard({ profile, onPress }: { profile: Profile; onPress: () => void }) {
  const avatar = AVATAR_ASSETS[profile.avatar_class] || AVATAR_ASSETS.knight;
  const rankColor = RANK_COLORS[profile.rank] || colors.primary;

  return (
    <Pressable onPress={onPress} testID={`hero-card-${profile.name}`} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <AvatarView avatarClass={profile.avatar_class} avatarImage={profile.avatar_image} size={72} borderWidth={4} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.cardName}>{profile.name}</Text>
        <Text style={styles.cardClass}>{avatar.label} · {avatar.tagline}</Text>
        <View style={styles.cardRow}>
          <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
            <MaterialCommunityIcons name="shield-crown" size={12} color="#000" />
            <Text style={styles.rankBadgeText}>{profile.rank}</Text>
          </View>
          <Text style={styles.levelText}>Lv {profile.level}</Text>
          <View style={styles.xpPill}>
            <MaterialCommunityIcons name="star-four-points" size={12} color={colors.primary} />
            <Text style={styles.xpPillText}>{profile.xp} XP</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.xpPill}>
            <MaterialCommunityIcons name="fire" size={12} color="#FF8C42" />
            <Text style={styles.xpPillText}>{profile.streak} day</Text>
          </View>
          <View style={styles.xpPill}>
            <MaterialCommunityIcons name="treasure-chest" size={12} color={colors.goldLight} />
            <Text style={styles.xpPillText}>${profile.gold.toFixed(2)}</Text>
          </View>
        </View>
      </View>
      <MaterialCommunityIcons name="lock" size={22} color={colors.inkMuted} />
    </Pressable>
  );
}

function BossCard({ profile, onPress }: { profile: Profile; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} testID="boss-card" style={({ pressed }) => [styles.bossCard, pressed && styles.cardPressed]}>
      <View style={styles.bossCrown}>
        <MaterialCommunityIcons name="crown" size={36} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.bossName}>Boss Mode</Text>
        <Text style={styles.bossSub}>The Ruler of this Realm</Text>
      </View>
      <MaterialCommunityIcons name="key-variant" size={22} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 18, paddingBottom: 60 },
  header: { alignItems: 'center', marginTop: 10, marginBottom: 26 },
  title: {
    color: colors.primary,
    fontSize: 38,
    fontFamily: 'Georgia',
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 6,
    textShadowColor: '#000',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  subtitle: { color: colors.parchmentDeep, fontSize: 13, fontStyle: 'italic', marginTop: 4, letterSpacing: 1 },
  divider: { width: 80, height: 2, backgroundColor: colors.primary, marginVertical: 14, opacity: 0.6 },
  prompt: { color: colors.parchment, fontSize: 15, fontStyle: 'italic', fontFamily: 'Georgia' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.parchment,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  avatarShield: {
    width: 72, height: 72, borderRadius: 16, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  avatarEmoji: { fontSize: 36 },
  cardName: { color: colors.ink, fontSize: 22, fontWeight: '900', fontFamily: 'Georgia', letterSpacing: 0.5 },
  cardClass: { color: colors.inkMuted, fontSize: 12, fontStyle: 'italic', marginTop: 2, marginBottom: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  rankBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: '#000',
  },
  rankBadgeText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  levelText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  xpPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderWidth: 1, borderColor: colors.inkMuted,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
  },
  xpPillText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  bossCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.burgundyDark,
    borderWidth: 2, borderColor: colors.primary,
    borderRadius: 10, padding: 16, marginTop: 10, marginBottom: 14,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  bossCrown: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  bossName: { color: colors.primary, fontSize: 22, fontWeight: '900', fontFamily: 'Georgia', letterSpacing: 1 },
  bossSub: { color: colors.parchmentDark, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  footer: { textAlign: 'center', color: colors.inkMuted, marginTop: 30, fontSize: 12, letterSpacing: 2 },
});
