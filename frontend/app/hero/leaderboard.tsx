import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, Profile } from '../../src/api';
import { colors, AVATAR_ASSETS, RANK_COLORS } from '../../src/theme';
import { AvatarView } from '../../src/AvatarView';
import { Parchment, HeaderBanner } from '../../src/ui';
import { useSession } from '../../src/session';

export default function Leaderboard() {
  const { profile } = useSession();
  const [board, setBoard] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await api.leaderboard();
    setBoard(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Hall of Glory" subtitle="Who shall reign supreme?" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        {board.map((p, idx) => {
          const avatar = AVATAR_ASSETS[p.avatar_class] || AVATAR_ASSETS.knight;
          const rankColor = RANK_COLORS[p.rank] || colors.primary;
          const isMe = profile?.id === p.id;
          return (
            <Parchment key={p.id} style={[styles.row, isMe && styles.rowMe]}>
              <View style={styles.position}>
                <MaterialCommunityIcons
                  name={idx === 0 ? 'crown' : idx === 1 ? 'medal' : 'shield-star'}
                  size={24}
                  color={idx === 0 ? colors.primary : idx === 1 ? '#C0C0C0' : '#CD7F32'}
                />
                <Text style={[styles.rankNum, { color: idx === 0 ? colors.primary : colors.ink }]}>#{idx + 1}</Text>
              </View>
              <AvatarView avatarClass={p.avatar_class} avatarImage={p.avatar_image} size={54} borderWidth={3} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}{isMe ? ' (You)' : ''}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
                    <Text style={styles.rankBadgeText}>{p.rank}</Text>
                  </View>
                  <Text style={styles.level}>Lv {p.level}</Text>
                </View>
              </View>
              <View style={styles.stats}>
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="star-four-points" size={14} color={colors.primary} />
                  <Text style={styles.statText}>{p.xp}</Text>
                </View>
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="fire" size={14} color="#FF8C42" />
                  <Text style={styles.statText}>{p.streak}d</Text>
                </View>
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="treasure-chest" size={14} color={colors.goldLight} />
                  <Text style={styles.statText}>${p.total_earned.toFixed(2)}</Text>
                </View>
              </View>
            </Parchment>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 14, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  rowMe: { borderColor: colors.primary, borderWidth: 3 },
  position: { alignItems: 'center', width: 44 },
  rankNum: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  avatar: { width: 54, height: 54, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  name: { color: colors.ink, fontSize: 17, fontWeight: '900', fontFamily: 'Georgia' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  rankBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#000' },
  rankBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },
  level: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  stats: { alignItems: 'flex-end', gap: 2 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
});
