import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api, Completion } from '../../src/api';
import { colors, AVATAR_ASSETS } from '../../src/theme';
import { Parchment, HeaderBanner, GoldButton, SectionTitle, StoneCard } from '../../src/ui';
import { useSession } from '../../src/session';

export default function BossApprovals() {
  const { logout } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState<Completion[]>([]);
  const [recent, setRecent] = useState<Completion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [photoView, setPhotoView] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, all] = await Promise.all([
      api.listCompletions({ status: 'pending' }),
      api.listCompletions({}),
    ]);
    setPending(p);
    setRecent(all.filter((c) => c.status !== 'pending').slice(0, 8));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const approve = async (c: Completion) => {
    setBusyId(c.id);
    try {
      const res = await api.approveCompletion(c.id);
      if (res?.awarded) {
        const { xp, gold, streak_bonus_xp, wheel_spins, new_streak } = res.awarded;
        let msg = `+${xp} XP · $${gold.toFixed(2)} awarded to ${c.profile_name}`;
        if (streak_bonus_xp > 0) msg += `\n🔥 Streak bonus: +${streak_bonus_xp} XP (${new_streak}-day streak)`;
        if (wheel_spins > 0) msg += `\n🎡 +${wheel_spins} Wheel spin${wheel_spins > 1 ? 's' : ''} unlocked!`;
        Alert.alert('Approved!', msg);
      }
      await load();
    } catch (e: any) { Alert.alert('Error', e?.message); }
    finally { setBusyId(null); }
  };

  const reject = async (c: Completion) => {
    Alert.alert('Reject quest?', `Mark "${c.quest_title}" as rejected?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          setBusyId(c.id);
          try { await api.rejectCompletion(c.id); await load(); }
          catch (e: any) { Alert.alert('Error', e?.message); }
          finally { setBusyId(null); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner
        title="Boss Council"
        subtitle={`${pending.length} pending judgment`}
        right={
          <Pressable onPress={() => { logout(); router.replace('/'); }} testID="boss-logout" style={{ padding: 8 }}>
            <MaterialCommunityIcons name="logout-variant" size={22} color={colors.parchment} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        <SectionTitle icon="gavel">Pending Approval</SectionTitle>
        {pending.length === 0 ? (
          <StoneCard><Text style={styles.empty}>No quests awaiting thy judgment. 🏰</Text></StoneCard>
        ) : (
          pending.map((c) => {
            const profile = { avatar_class: 'knight' };
            const a = AVATAR_ASSETS.knight;
            return (
              <Parchment key={c.id} style={styles.pendingCard} testID={`pending-${c.id}`}>
                <View style={styles.pendingHeader}>
                  <Text style={styles.pendingName}>{c.profile_name}</Text>
                  <View style={styles.catPill}>
                    <Text style={styles.catPillText}>{c.quest_category.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.pendingTitle}>{c.quest_title}</Text>
                {c.photo ? (
                  <Pressable onPress={() => setPhotoView(c.photo!)} testID={`photo-thumb-${c.id}`} style={styles.photoThumbWrap}>
                    <Image source={{ uri: c.photo }} style={styles.photoThumb} resizeMode="cover" />
                    <View style={styles.photoOverlay}>
                      <MaterialCommunityIcons name="magnify-plus" size={18} color={colors.parchment} />
                      <Text style={styles.photoOverlayText}>Tap for proof</Text>
                    </View>
                  </Pressable>
                ) : null}
                <View style={styles.rewardsRow}>
                  <View style={styles.rewChip}>
                    <MaterialCommunityIcons name="star-four-points" size={14} color={colors.primary} />
                    <Text style={styles.rewText}>+{c.xp}{c.bonus_xp > 0 ? ` (+${c.bonus_xp} 2x)` : ''} XP</Text>
                  </View>
                  <View style={styles.rewChip}>
                    <MaterialCommunityIcons name="treasure-chest" size={14} color={colors.goldLight} />
                    <Text style={styles.rewText}>${c.gold.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <GoldButton
                    label="Approve"
                    variant="forest"
                    icon="check-decagram"
                    onPress={() => approve(c)}
                    disabled={busyId === c.id}
                    testID={`approve-${c.id}`}
                    style={{ flex: 1 }}
                    small
                  />
                  <GoldButton
                    label="Reject"
                    variant="danger"
                    icon="close-octagon"
                    onPress={() => reject(c)}
                    disabled={busyId === c.id}
                    testID={`reject-${c.id}`}
                    style={{ flex: 1 }}
                    small
                  />
                </View>
              </Parchment>
            );
          })
        )}

        <SectionTitle icon="history">Recent Decisions</SectionTitle>
        {recent.length === 0 ? (
          <StoneCard><Text style={styles.empty}>No history yet.</Text></StoneCard>
        ) : (
          recent.map((c) => (
            <View key={c.id} style={styles.historyRow}>
              <MaterialCommunityIcons
                name={c.status === 'approved' ? 'check-decagram' : 'close-octagon'}
                size={18}
                color={c.status === 'approved' ? colors.forestBright : colors.danger}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>{c.quest_title}</Text>
                <Text style={styles.historyMeta}>{c.profile_name} · {c.status}</Text>
              </View>
              <Text style={styles.historyXP}>+{c.xp + (c.bonus_xp || 0)} XP</Text>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={!!photoView} transparent animationType="fade" onRequestClose={() => setPhotoView(null)}>
        <Pressable style={styles.photoModalBg} onPress={() => setPhotoView(null)}>
          {photoView ? <Image source={{ uri: photoView }} style={styles.photoFull} resizeMode="contain" /> : null}
          <Pressable onPress={() => setPhotoView(null)} style={styles.photoClose} testID="photo-close">
            <MaterialCommunityIcons name="close" size={28} color={colors.parchment} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 14, paddingBottom: 40 },
  empty: { color: colors.inkMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  pendingCard: { marginBottom: 10 },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pendingName: { color: colors.burgundy, fontSize: 13, fontWeight: '900', letterSpacing: 0.5, fontFamily: 'Georgia' },
  catPill: { backgroundColor: colors.burgundyDark, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  catPillText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  pendingTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', fontFamily: 'Georgia', marginBottom: 6 },
  rewardsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  rewChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  rewText: { color: colors.parchment, fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.stoneLight },
  historyTitle: { color: colors.parchment, fontSize: 13, fontWeight: '700' },
  historyMeta: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  historyXP: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  photoThumbWrap: { marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: colors.primaryDark },
  photoThumb: { width: '100%', height: 160 },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoOverlayText: { color: colors.parchment, fontSize: 11, fontWeight: '700' },
  photoModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  photoFull: { width: '100%', height: '100%' },
  photoClose: { position: 'absolute', top: 40, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: colors.parchment, alignItems: 'center', justifyContent: 'center' },
});
