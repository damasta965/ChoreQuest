import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, Quest, Profile } from '../../src/api';
import { colors } from '../../src/theme';
import { Parchment, HeaderBanner, GoldButton, SectionTitle, StoneCard } from '../../src/ui';

type Form = {
  id?: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly' | 'extra';
  xp: string;
  gold: string;
  assigned_to: string;
  icon: string;
};

const DEFAULT_FORM: Form = {
  title: '', description: '', category: 'daily', xp: '10', gold: '0.25', assigned_to: 'all', icon: 'scroll',
};

const ICON_CHOICES = ['scroll', 'bed', 'silverware-fork-knife', 'book-open-variant', 'dog', 'food-drumstick', 'tooth', 'trash-can', 'vacuum', 'shower', 'washing-machine', 'chef-hat', 'tree', 'car-wash', 'bookshelf', 'heart', 'sword', 'shield', 'hammer'];

export default function ManageQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'extra'>('all');

  const load = useCallback(async () => {
    const [q, p] = await Promise.all([api.listQuests(), api.listProfiles()]);
    setQuests(q);
    setProfiles(p.filter((x: Profile) => x.role === 'kid'));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => { setForm(DEFAULT_FORM); setModalOpen(true); };
  const openEdit = (q: Quest) => {
    setForm({ id: q.id, title: q.title, description: q.description, category: q.category, xp: String(q.xp), gold: String(q.gold), assigned_to: q.assigned_to, icon: q.icon });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { Alert.alert('Enter a title'); return; }
    const payload = {
      title: form.title.trim(),
      description: form.description,
      category: form.category,
      xp: parseInt(form.xp) || 0,
      gold: parseFloat(form.gold) || 0,
      assigned_to: form.assigned_to,
      icon: form.icon,
    };
    try {
      if (form.id) await api.updateQuest(form.id, payload);
      else await api.createQuest(payload);
      setModalOpen(false);
      await load();
    } catch (e: any) { Alert.alert('Error', e?.message); }
  };

  const del = (q: Quest) => {
    Alert.alert('Delete quest?', `Remove "${q.title}" forever?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteQuest(q.id); await load(); } catch (e: any) { Alert.alert('Error', e?.message); }
      }},
    ]);
  };

  const filtered = quests.filter((q) => filter === 'all' || q.category === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Quest Scribe" subtitle="Forge new challenges" right={
        <Pressable onPress={openNew} testID="new-quest-btn" style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={22} color="#000" />
        </Pressable>
      } />
      <View style={styles.filters}>
        {(['all', 'daily', 'weekly', 'extra'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterActive]} testID={`filter-${f}`}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {filtered.length === 0 ? (
          <StoneCard><Text style={styles.empty}>No quests yet. Tap + to create one.</Text></StoneCard>
        ) : filtered.map((q) => (
          <Parchment key={q.id} style={styles.card} testID={`quest-manage-${q.id}`}>
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name={q.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.title}>{q.title}</Text>
                <Text style={styles.sub}>{q.category} · +{q.xp} XP · ${q.gold.toFixed(2)} · {q.assigned_to === 'all' ? 'All Heroes' : (profiles.find(p => p.id === q.assigned_to)?.name || '—')}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <GoldButton small label="Edit" icon="pencil" variant="stone" onPress={() => openEdit(q)} testID={`edit-${q.id}`} style={{ flex: 1 }} />
              <GoldButton small label="Delete" icon="trash-can" variant="danger" onPress={() => del(q)} testID={`delete-${q.id}`} style={{ flex: 1 }} />
            </View>
          </Parchment>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>{form.id ? 'Edit Quest' : 'New Quest'}</Text>
              <Label>Title</Label>
              <TextInput value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} style={styles.input} placeholder="e.g. Feed the Hounds" placeholderTextColor={colors.inkMuted} testID="form-title" />
              <Label>Description</Label>
              <TextInput value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} style={[styles.input, { minHeight: 60 }]} placeholder="Details..." placeholderTextColor={colors.inkMuted} multiline testID="form-desc" />
              <Label>Category</Label>
              <View style={styles.segRow}>
                {(['daily', 'weekly', 'extra'] as const).map((c) => (
                  <Pressable key={c} onPress={() => setForm({ ...form, category: c })} style={[styles.seg, form.category === c && styles.segActive]}>
                    <Text style={[styles.segText, form.category === c && styles.segTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Label>XP</Label>
                  <TextInput value={form.xp} onChangeText={(v) => setForm({ ...form, xp: v })} keyboardType="number-pad" style={styles.input} testID="form-xp" />
                </View>
                <View style={{ flex: 1 }}>
                  <Label>Gold ($)</Label>
                  <TextInput value={form.gold} onChangeText={(v) => setForm({ ...form, gold: v })} keyboardType="decimal-pad" style={styles.input} testID="form-gold" />
                </View>
              </View>
              <Label>Assign To</Label>
              <View style={styles.segRow}>
                <Pressable onPress={() => setForm({ ...form, assigned_to: 'all' })} style={[styles.seg, form.assigned_to === 'all' && styles.segActive]}>
                  <Text style={[styles.segText, form.assigned_to === 'all' && styles.segTextActive]}>All</Text>
                </Pressable>
                {profiles.map((p) => (
                  <Pressable key={p.id} onPress={() => setForm({ ...form, assigned_to: p.id })} style={[styles.seg, form.assigned_to === p.id && styles.segActive]}>
                    <Text style={[styles.segText, form.assigned_to === p.id && styles.segTextActive]}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Label>Icon</Label>
              <View style={styles.iconGrid}>
                {ICON_CHOICES.map((ic) => (
                  <Pressable key={ic} onPress={() => setForm({ ...form, icon: ic })} style={[styles.iconBtn, form.icon === ic && { borderColor: colors.primary, borderWidth: 2 }]}>
                    <MaterialCommunityIcons name={ic as any} size={22} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
              <View style={{ height: 14 }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <GoldButton label="Cancel" variant="stone" onPress={() => setModalOpen(false)} style={{ flex: 1 }} />
                <GoldButton label={form.id ? 'Update' : 'Create'} onPress={save} style={{ flex: 1 }} testID="form-save" />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 6, padding: 10, backgroundColor: colors.burgundyDark, borderBottomWidth: 1, borderBottomColor: colors.primaryDark },
  filterChip: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.primaryDark, backgroundColor: colors.bg, alignItems: 'center' },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.parchment, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  filterTextActive: { color: '#000' },
  container: { padding: 14, paddingBottom: 40 },
  empty: { color: colors.inkMuted, textAlign: 'center', fontStyle: 'italic', paddingVertical: 10 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.parchmentDark },
  title: { color: colors.ink, fontSize: 15, fontWeight: '900', fontFamily: 'Georgia' },
  sub: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%', borderTopWidth: 2, borderTopColor: colors.primary },
  modalTitle: { color: colors.primary, fontSize: 22, fontWeight: '900', fontFamily: 'Georgia', letterSpacing: 1, marginBottom: 14 },
  label: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4, letterSpacing: 1 },
  input: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.stoneLight, borderRadius: 8, padding: 10, color: colors.parchment, fontSize: 14 },
  segRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.stoneLight, backgroundColor: colors.bgCard },
  segActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { color: colors.parchment, fontSize: 12, fontWeight: '700' },
  segTextActive: { color: '#000' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.stoneLight, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
});
