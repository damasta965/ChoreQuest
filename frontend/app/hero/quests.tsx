import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSession } from '../../src/session';
import { api, Quest, Completion } from '../../src/api';
import { colors } from '../../src/theme';
import { Parchment, GoldButton, SectionTitle, HeaderBanner } from '../../src/ui';

type Tab = 'daily' | 'weekly' | 'extra';

export default function QuestsScreen() {
  const { profile, refresh } = useSession();
  const [tab, setTab] = useState<Tab>('daily');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const [q, c] = await Promise.all([
      api.listQuests({ profile_id: profile.id }),
      api.listCompletions({ profile_id: profile.id }),
    ]);
    setQuests(q);
    setCompletions(c);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!profile) return null;

  const isDone = (q: Quest): Completion | undefined => {
    const now = new Date();
    return completions.find((c) => {
      if (c.quest_id !== q.id) return false;
      if (c.status === 'rejected') return false;
      const t = new Date(c.submitted_at);
      if (q.category === 'daily') {
        return t.toDateString() === now.toDateString();
      }
      if (q.category === 'weekly') {
        const monday = new Date(now);
        monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        monday.setHours(0, 0, 0, 0);
        return t >= monday;
      }
      return false; // extra can be done multiple times
    });
  };

  const submit = async (q: Quest, useDoubleXp = false) => {
    setBusyId(q.id);
    try {
      await api.submitCompletion(q.id, profile.id, useDoubleXp);
      await refresh();
      await load();
    } catch (e: any) {
      Alert.alert('Cannot submit', e?.message || 'Try again');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = quests.filter((q) => q.category === tab);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Quest Board" subtitle="Honorable deeds await thee" />
      <View style={styles.tabs}>
        {(['daily', 'weekly', 'extra'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            testID={`tab-${t}`}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <MaterialCommunityIcons
              name={t === 'daily' ? 'weather-sunny' : t === 'weekly' ? 'calendar-week' : 'star-four-points'}
              size={16}
              color={tab === t ? '#000' : colors.parchment}
            />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'extra' ? 'EXTRA CREDIT' : t.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No quests in this ledger.</Text>
        ) : (
          filtered.map((q) => {
            const done = isDone(q);
            const busy = busyId === q.id;
            return (
              <Parchment key={q.id} style={styles.questCard} testID={`quest-${q.id}`}>
                <View style={styles.questHeader}>
                  <View style={styles.questIcon}>
                    <MaterialCommunityIcons name={q.icon as any} size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.questTitle}>{q.title}</Text>
                    {q.description ? <Text style={styles.questDesc}>{q.description}</Text> : null}
                  </View>
                </View>
                <View style={styles.questRewards}>
                  <View style={styles.rewardChip}>
                    <MaterialCommunityIcons name="star-four-points" size={14} color={colors.primary} />
                    <Text style={styles.rewardText}>+{q.xp} XP</Text>
                  </View>
                  <View style={styles.rewardChip}>
                    <MaterialCommunityIcons name="treasure-chest" size={14} color={colors.goldLight} />
                    <Text style={styles.rewardText}>${q.gold.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 10 }}>
                  {done ? (
                    <View style={styles.doneBadge}>
                      <MaterialCommunityIcons
                        name={done.status === 'approved' ? 'check-decagram' : 'clock-outline'}
                        size={16}
                        color={done.status === 'approved' ? colors.forestBright : colors.primary}
                      />
                      <Text style={styles.doneText}>
                        {done.status === 'approved' ? 'APPROVED' : 'AWAITING BOSS APPROVAL'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <GoldButton
                        label={busy ? '...' : 'Mark Complete'}
                        onPress={() => submit(q)}
                        disabled={busy}
                        testID={`complete-${q.id}`}
                        icon="sword"
                        style={{ flex: 1 }}
                      />
                      {profile.double_xp_tokens > 0 && (
                        <GoldButton
                          label="2x XP"
                          variant="burgundy"
                          onPress={() => submit(q, true)}
                          disabled={busy}
                          testID={`complete-2x-${q.id}`}
                          icon="star-shooting"
                          small
                        />
                      )}
                    </View>
                  )}
                </View>
              </Parchment>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 14, paddingBottom: 40 },
  tabs: { flexDirection: 'row', gap: 6, padding: 10, backgroundColor: colors.burgundyDark, borderBottomWidth: 1, borderBottomColor: colors.primaryDark },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.primaryDark, backgroundColor: colors.bg },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.parchment, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  tabTextActive: { color: '#000' },
  questCard: { marginBottom: 10 },
  questHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.parchmentDark },
  questTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', fontFamily: 'Georgia' },
  questDesc: { color: colors.inkMuted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  questRewards: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rewardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rewardText: { color: colors.parchment, fontSize: 12, fontWeight: '700' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, justifyContent: 'center', backgroundColor: colors.bg, borderRadius: 6, borderWidth: 1, borderColor: colors.primaryDark },
  doneText: { color: colors.parchment, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  empty: { textAlign: 'center', color: colors.inkMuted, fontStyle: 'italic', marginTop: 30 },
});
