import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert, Modal, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../../src/session';
import { api, Quest, Completion } from '../../src/api';
import { colors } from '../../src/theme';
import { Parchment, GoldButton, HeaderBanner } from '../../src/ui';

type Tab = 'daily' | 'weekly' | 'extra';

export default function QuestsScreen() {
  const { profile, refresh } = useSession();
  const [tab, setTab] = useState<Tab>('daily');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<{ quest: Quest; useDoubleXp: boolean } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

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
      return false;
    });
  };

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Please allow access to continue.'); return; }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, mediaTypes: 'images', allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: 'images', allowsEditing: true, aspect: [1, 1] });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e: any) { Alert.alert('Error', e?.message); }
  };

  const openSubmit = (q: Quest, useDoubleXp = false) => {
    setPhoto(null);
    if (q.photo_required) {
      setPhotoModal({ quest: q, useDoubleXp });
    } else {
      submit(q, useDoubleXp, null);
    }
  };

  const submit = async (q: Quest, useDoubleXp: boolean, ph: string | null) => {
    setBusyId(q.id);
    try {
      await api.submitCompletion(q.id, profile.id, useDoubleXp, ph || undefined);
      await refresh();
      await load();
      setPhotoModal(null);
      setPhoto(null);
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
          <Pressable key={t} testID={`tab-${t}`} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <MaterialCommunityIcons
              name={t === 'daily' ? 'weather-sunny' : t === 'weekly' ? 'calendar-week' : 'star-four-points'}
              size={16}
              color={tab === t ? '#000' : colors.parchment}
            />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'extra' ? 'EXTRA CREDIT' : t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No quests in this ledger.</Text>
        ) : filtered.map((q) => {
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
                {q.photo_required ? (
                  <View style={styles.photoBadge}>
                    <MaterialCommunityIcons name="camera" size={12} color="#000" />
                    <Text style={styles.photoBadgeText}>PROOF</Text>
                  </View>
                ) : null}
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
                    <GoldButton label={busy ? '...' : 'Mark Complete'} onPress={() => openSubmit(q)} disabled={busy} testID={`complete-${q.id}`} icon="sword" style={{ flex: 1 }} />
                    {profile.double_xp_tokens > 0 && (
                      <GoldButton label="2x XP" variant="burgundy" onPress={() => openSubmit(q, true)} disabled={busy} testID={`complete-2x-${q.id}`} icon="star-shooting" small />
                    )}
                  </View>
                )}
              </View>
            </Parchment>
          );
        })}
      </ScrollView>

      <Modal visible={!!photoModal} transparent animationType="slide" onRequestClose={() => { if (!busyId) { setPhotoModal(null); setPhoto(null); } }}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Photo Proof Required</Text>
            <Text style={styles.modalSub}>{photoModal?.quest.title}</Text>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={styles.placeholder}>
                <MaterialCommunityIcons name="camera-plus" size={48} color={colors.primary} />
                <Text style={styles.placeholderText}>No photo yet</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <GoldButton label="Camera" icon="camera" variant="stone" onPress={() => pickPhoto(true)} style={{ flex: 1 }} testID="photo-camera" small />
              <GoldButton label="Gallery" icon="image" variant="stone" onPress={() => pickPhoto(false)} style={{ flex: 1 }} testID="photo-gallery" small />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <GoldButton label="Cancel" variant="stone" onPress={() => { setPhotoModal(null); setPhoto(null); }} disabled={!!busyId} style={{ flex: 1 }} />
              <GoldButton
                label={busyId ? 'Sending...' : 'Submit'}
                icon="check"
                onPress={() => photoModal && submit(photoModal.quest, photoModal.useDoubleXp, photo)}
                disabled={!photo || !!busyId}
                testID="photo-submit"
                style={{ flex: 1 }}
              />
            </View>
            {busyId ? <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} /> : null}
          </View>
        </View>
      </Modal>
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
  questHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.parchmentDark },
  questTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', fontFamily: 'Georgia' },
  questDesc: { color: colors.inkMuted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  photoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  photoBadgeText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  questRewards: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rewardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rewardText: { color: colors.parchment, fontSize: 12, fontWeight: '700' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, justifyContent: 'center', backgroundColor: colors.bg, borderRadius: 6, borderWidth: 1, borderColor: colors.primaryDark },
  doneText: { color: colors.parchment, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  empty: { textAlign: 'center', color: colors.inkMuted, fontStyle: 'italic', marginTop: 30 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 2, borderTopColor: colors.primary },
  modalTitle: { color: colors.primary, fontSize: 20, fontWeight: '900', fontFamily: 'Georgia', letterSpacing: 1 },
  modalSub: { color: colors.parchment, fontSize: 14, marginTop: 4, fontStyle: 'italic' },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 10, borderWidth: 2, borderColor: colors.primary, marginTop: 14 },
  placeholder: { width: '100%', aspectRatio: 1, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primaryDark, marginTop: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  placeholderText: { color: colors.inkMuted, marginTop: 8, fontStyle: 'italic' },
});
