import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSession } from '../../src/session';
import { api, Completion } from '../../src/api';
import { colors, AVATAR_ASSETS, RANK_COLORS, RANK_THRESHOLDS } from '../../src/theme';
import { AvatarView } from '../../src/AvatarView';
import { Parchment, StoneCard, XPBar, SectionTitle, GoldButton, HeaderBanner } from '../../src/ui';

export default function HeroDashboard() {
  const { profile, refresh, logout } = useSession();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<Completion[]>([]);
  const [recent, setRecent] = useState<Completion[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    await refresh();
    const [p, r] = await Promise.all([
      api.listCompletions({ profile_id: profile.id, status: 'pending' }),
      api.listCompletions({ profile_id: profile.id }),
    ]);
    setPending(p);
    setRecent(r.slice(0, 5));
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!profile) return null;
  const avatar = AVATAR_ASSETS[profile.avatar_class] || AVATAR_ASSETS.knight;
  const rankColor = RANK_COLORS[profile.rank] || colors.primary;
  const nextRank = profile.next_rank;
  const currentRankThreshold = RANK_THRESHOLDS[profile.rank] ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner
        title={`Sir ${profile.name}`}
        subtitle={`${avatar.label} · ${avatar.tagline}`}
        right={
          <Pressable onPress={() => { logout(); router.replace('/'); }} testID="hero-logout" style={styles.logoutBtn}>
            <MaterialCommunityIcons name="logout-variant" size={22} color={colors.parchment} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        {/* Hero Card */}
        <Parchment style={styles.heroCard}>
          <View style={styles.heroRow}>
            <AvatarView avatarClass={profile.avatar_class} avatarImage={profile.avatar_image} size={72} borderWidth={4} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
                <MaterialCommunityIcons name="shield-crown" size={14} color="#000" />
                <Text style={styles.rankBadgeText}>{profile.rank.toUpperCase()}</Text>
              </View>
              <Text style={styles.levelBig}>Level {profile.level}</Text>
              <Text style={styles.xpSub}>{profile.xp} XP total</Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <XPBar xp={profile.xp} nextThreshold={nextRank?.threshold ?? null} rankThreshold={currentRankThreshold} />
            <Text style={styles.xpCaption}>
              {nextRank ? `${nextRank.xp_to_next} XP to ${nextRank.name}` : 'MAX RANK: LEGEND! 👑'}
            </Text>
          </View>
        </Parchment>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBlock icon="fire" label="Streak" value={`${profile.streak}`} sub="days" color="#FF8C42" />
          <StatBlock icon="treasure-chest" label="Gold" value={`$${profile.gold.toFixed(2)}`} sub="unpaid" color={colors.goldLight} />
          <StatBlock icon="compass-rose" label="Spins" value={`${profile.wheel_spins}`} sub="available" color="#9B59FF" />
        </View>

        {/* Tokens */}
        {(profile.double_xp_tokens > 0 || profile.skip_tokens > 0) && (
          <View style={styles.tokenRow}>
            {profile.double_xp_tokens > 0 && (
              <View style={styles.tokenChip}>
                <MaterialCommunityIcons name="star-shooting" size={16} color={colors.primary} />
                <Text style={styles.tokenText}>{profile.double_xp_tokens}× 2x XP Token</Text>
              </View>
            )}
            {profile.skip_tokens > 0 && (
              <View style={styles.tokenChip}>
                <MaterialCommunityIcons name="debug-step-over" size={16} color={colors.primary} />
                <Text style={styles.tokenText}>{profile.skip_tokens}× Skip Token</Text>
              </View>
            )}
          </View>
        )}

        <SectionTitle icon="script-text">Active Orders</SectionTitle>
        <StoneCard>
          <Pressable onPress={() => router.push('/hero/quests')} testID="go-quests" style={styles.linkRow}>
            <MaterialCommunityIcons name="sword-cross" size={22} color={colors.primary} />
            <Text style={styles.linkText}>View the Quest Board</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        </StoneCard>

        <SectionTitle icon="clock-outline">Awaiting Boss Approval</SectionTitle>
        {pending.length === 0 ? (
          <StoneCard><Text style={styles.empty}>No pending quests. Complete some to earn XP!</Text></StoneCard>
        ) : (
          pending.map((c) => (
            <Parchment key={c.id} style={styles.completionCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.completionTitle}>{c.quest_title}</Text>
                <Text style={styles.completionMeta}>+{c.xp} XP · ${c.gold.toFixed(2)} · {c.quest_category}</Text>
              </View>
              <View style={styles.pendingBadge}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#000" />
                <Text style={styles.pendingBadgeText}>PENDING</Text>
              </View>
            </Parchment>
          ))
        )}

        <SectionTitle icon="history">Recent Activity</SectionTitle>
        {recent.length === 0 ? (
          <StoneCard><Text style={styles.empty}>No history yet.</Text></StoneCard>
        ) : (
          recent.map((c) => (
            <View key={c.id} style={styles.historyRow}>
              <MaterialCommunityIcons
                name={c.status === 'approved' ? 'check-decagram' : c.status === 'rejected' ? 'close-octagon' : 'clock-outline'}
                size={20}
                color={c.status === 'approved' ? colors.forestBright : c.status === 'rejected' ? colors.danger : colors.primary}
              />
              <Text style={styles.historyTitle}>{c.quest_title}</Text>
              <Text style={styles.historyMeta}>+{c.xp + (c.bonus_xp || 0)} XP</Text>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <View style={styles.statBlock}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 14, paddingBottom: 40 },
  logoutBtn: { padding: 8 },
  heroCard: { marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatarShield: { width: 72, height: 72, borderRadius: 16, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  avatarEmoji: { fontSize: 36 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#000' },
  rankBadgeText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  levelBig: { color: colors.ink, fontSize: 24, fontWeight: '900', fontFamily: 'Georgia', marginTop: 4 },
  xpSub: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  xpCaption: { color: colors.inkMuted, fontSize: 11, marginTop: 6, textAlign: 'right', fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statBlock: { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.stoneLight, borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { color: colors.parchment, fontSize: 20, fontWeight: '900', fontFamily: 'Georgia', marginTop: 4 },
  statLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  statSub: { color: colors.inkMuted, fontSize: 10, fontStyle: 'italic' },
  tokenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tokenChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.burgundyDark, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tokenText: { color: colors.parchment, fontSize: 12, fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkText: { flex: 1, color: colors.parchment, fontSize: 15, fontWeight: '700' },
  empty: { color: colors.inkMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  completionCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  completionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  completionMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pendingBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.stoneLight },
  historyTitle: { flex: 1, color: colors.parchment, fontSize: 14 },
  historyMeta: { color: colors.primary, fontSize: 12, fontWeight: '700' },
});
