import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, Profile } from '../../src/api';
import { colors, AVATAR_ASSETS } from '../../src/theme';
import { Parchment, HeaderBanner, GoldButton, SectionTitle, StoneCard } from '../../src/ui';

export default function Payouts() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [payoutModal, setPayoutModal] = useState<{ profile: Profile; amount: string; note: string } | null>(null);

  const load = useCallback(async () => {
    const [p, h] = await Promise.all([api.listProfiles(), api.listPayouts()]);
    setProfiles(p.filter((x: Profile) => x.role === 'kid'));
    setHistory(h);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openPayout = (p: Profile) => {
    setPayoutModal({ profile: p, amount: p.gold.toFixed(2), note: '' });
  };

  const submit = async () => {
    if (!payoutModal) return;
    const amt = parseFloat(payoutModal.amount);
    if (!amt || amt <= 0) { Alert.alert('Enter a valid amount'); return; }
    try {
      await api.createPayout(payoutModal.profile.id, amt, payoutModal.note);
      setPayoutModal(null);
      await load();
      Alert.alert('Paid!', `$${amt.toFixed(2)} paid to ${payoutModal.profile.name}`);
    } catch (e: any) { Alert.alert('Error', e?.message); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Royal Treasury" subtitle="Payouts & Ledger" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        <SectionTitle icon="treasure-chest">Owed to Heroes</SectionTitle>
        {profiles.map((p) => {
          const a = AVATAR_ASSETS[p.avatar_class] || AVATAR_ASSETS.knight;
          return (
            <Parchment key={p.id} style={styles.card} testID={`payout-card-${p.name}`}>
              <View style={styles.row}>
                <View style={[styles.avatar, { borderColor: a.color }]}>
                  <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.sub}>Earned ${p.total_earned.toFixed(2)} · Paid ${p.total_paid.toFixed(2)}</Text>
                </View>
                <View style={styles.owedBlock}>
                  <Text style={styles.owedLabel}>OWED</Text>
                  <Text style={styles.owedAmt}>${p.gold.toFixed(2)}</Text>
                </View>
              </View>
              <GoldButton
                label={p.gold > 0 ? `Pay ${p.name} $${p.gold.toFixed(2)}` : 'Nothing owed'}
                icon="cash"
                onPress={() => openPayout(p)}
                disabled={p.gold <= 0}
                testID={`pay-${p.name}`}
                style={{ marginTop: 10 }}
              />
            </Parchment>
          );
        })}

        <SectionTitle icon="history">Payout Ledger</SectionTitle>
        {history.length === 0 ? (
          <StoneCard><Text style={styles.empty}>No payouts yet.</Text></StoneCard>
        ) : history.map((h) => (
          <View key={h.id} style={styles.historyRow}>
            <MaterialCommunityIcons name="cash" size={20} color={colors.forestBright} />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>${h.amount.toFixed(2)} to {h.profile_name}</Text>
              <Text style={styles.historyMeta}>{new Date(h.created_at).toLocaleDateString()} {h.note ? `· ${h.note}` : ''}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={!!payoutModal} transparent animationType="slide" onRequestClose={() => setPayoutModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Pay {payoutModal?.profile.name}</Text>
            <Text style={styles.label}>Amount ($)</Text>
            <TextInput
              value={payoutModal?.amount}
              onChangeText={(v) => payoutModal && setPayoutModal({ ...payoutModal, amount: v })}
              keyboardType="decimal-pad"
              style={styles.input}
              testID="payout-amount"
            />
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              value={payoutModal?.note}
              onChangeText={(v) => payoutModal && setPayoutModal({ ...payoutModal, note: v })}
              placeholder="Cash, Venmo, etc."
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <GoldButton label="Cancel" variant="stone" onPress={() => setPayoutModal(null)} style={{ flex: 1 }} />
              <GoldButton label="Confirm" onPress={submit} testID="payout-confirm" style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 14, paddingBottom: 40 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 58, height: 58, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  name: { color: colors.ink, fontSize: 18, fontWeight: '900', fontFamily: 'Georgia' },
  sub: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  owedBlock: { alignItems: 'center', padding: 6, borderWidth: 2, borderColor: colors.primary, borderRadius: 8, backgroundColor: colors.bg },
  owedLabel: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  owedAmt: { color: colors.goldLight, fontSize: 18, fontWeight: '900', fontFamily: 'Georgia' },
  empty: { color: colors.inkMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.stoneLight },
  historyTitle: { color: colors.parchment, fontSize: 13, fontWeight: '700' },
  historyMeta: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 2, borderTopColor: colors.primary },
  modalTitle: { color: colors.primary, fontSize: 20, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 10 },
  label: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4, letterSpacing: 1 },
  input: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.stoneLight, borderRadius: 8, padding: 10, color: colors.parchment, fontSize: 14 },
});
