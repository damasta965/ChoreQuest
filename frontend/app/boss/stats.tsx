import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, Profile } from '../../src/api';
import { colors, AVATAR_ASSETS, RANK_COLORS, RANK_THRESHOLDS } from '../../src/theme';
import { Parchment, HeaderBanner, XPBar, SectionTitle, StoneCard } from '../../src/ui';

export default function Stats() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const d = await api.statsOverview();
    setData(d);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data) return <SafeAreaView style={styles.safe}><Text style={{ color: colors.parchment, padding: 20 }}>Loading...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Realm Overview" subtitle={`${data.pending_approvals} pending · ${data.approved_today} approved today`} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        <View style={styles.summary}>
          <SummaryTile icon="gavel" label="Pending" value={data.pending_approvals} color={colors.primary} />
          <SummaryTile icon="check-decagram" label="Done Today" value={data.approved_today} color={colors.forestBright} />
          <SummaryTile icon="account-group" label="Heroes" value={data.kids.length} color="#9B59FF" />
        </View>

        <SectionTitle icon="shield-crown">Hero Stats</SectionTitle>
        {data.kids.map((p: Profile) => {
          const a = AVATAR_ASSETS[p.avatar_class] || AVATAR_ASSETS.knight;
          const rankColor = RANK_COLORS[p.rank] || colors.primary;
          const currentThreshold = RANK_THRESHOLDS[p.rank] ?? 0;
          return (
            <Parchment key={p.id} style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={[styles.avatar, { borderColor: a.color }]}>
                  <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <View style={styles.rowWrap}>
                    <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
                      <Text style={styles.rankBadgeText}>{p.rank}</Text>
                    </View>
                    <Text style={styles.level}>Lv {p.level}</Text>
                    <Text style={styles.xp}>{p.xp} XP</Text>
                  </View>
                </View>
              </View>
              <View style={{ marginTop: 10 }}>
                <XPBar xp={p.xp} nextThreshold={p.next_rank?.threshold ?? null} rankThreshold={currentThreshold} />
                <Text style={styles.nextCap}>
                  {p.next_rank ? `${p.next_rank.xp_to_next} XP to ${p.next_rank.name}` : 'MAX RANK'}
                </Text>
              </View>
              <View style={styles.statsGrid}>
                <StatCell icon="fire" label="Streak" value={`${p.streak}d`} color="#FF8C42" />
                <StatCell icon="treasure-chest" label="Owed" value={`$${p.gold.toFixed(2)}`} color={colors.goldLight} />
                <StatCell icon="cash" label="Earned" value={`$${p.total_earned.toFixed(2)}`} color={colors.forestBright} />
                <StatCell icon="compass-rose" label="Spins" value={`${p.wheel_spins}`} color="#9B59FF" />
              </View>
            </Parchment>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={styles.tile}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function StatCell({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCell}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 14, paddingBottom: 40 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tile: { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.stoneLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  tileValue: { color: colors.parchment, fontSize: 22, fontWeight: '900', fontFamily: 'Georgia', marginTop: 4 },
  tileLabel: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  heroCard: { marginBottom: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  name: { color: colors.ink, fontSize: 18, fontWeight: '900', fontFamily: 'Georgia' },
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  rankBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#000' },
  rankBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },
  level: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  xp: { color: colors.burgundy, fontSize: 11, fontWeight: '800' },
  nextCap: { color: colors.inkMuted, fontSize: 11, marginTop: 4, textAlign: 'right', fontStyle: 'italic' },
  statsGrid: { flexDirection: 'row', gap: 6, marginTop: 10 },
  statCell: { flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.primaryDark, borderRadius: 8, padding: 8, alignItems: 'center' },
  statValue: { color: colors.parchment, fontSize: 14, fontWeight: '900', marginTop: 2 },
  statLabel: { color: colors.inkMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
});
