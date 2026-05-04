import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSession } from '../../src/session';
import { api } from '../../src/api';
import { colors, AVATAR_ASSETS } from '../../src/theme';
import { HeaderBanner, Parchment, SectionTitle, GoldButton, StoneCard } from '../../src/ui';
import { AvatarView } from '../../src/AvatarView';

const SLOTS = ['weapon', 'shield', 'helmet', 'cape'] as const;
type Slot = (typeof SLOTS)[number];

const PROMPT_PRESETS: Record<string, string[]> = {
  knight: ['heavy silver plate armor with blue cape', 'golden lion-crested armor', 'dark obsidian gauntlets'],
  archer: ['green hood with leather bracers', 'ranger cloak with tribal markings', 'silver-trimmed forest garb'],
  mage: ['starlit robes with glowing runes', 'fire-elemental purple robes', 'crystal staff and deep hood'],
  rogue: ['shadowy leather with twin daggers', 'crimson assassin garb', 'moonlit silver scarf'],
};

export default function Locker() {
  const { profile, refresh } = useSession();
  const [genOpen, setGenOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

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

  const generate = async () => {
    if (!prompt.trim()) { Alert.alert('Describe thy hero first.'); return; }
    setGenerating(true);
    try {
      await api.generateAvatar(profile.id, prompt.trim());
      await refresh();
      setGenOpen(false);
      setPrompt('');
    } catch (e: any) {
      Alert.alert('Generation failed', e?.message || 'Try again');
    } finally {
      setGenerating(false);
    }
  };

  const clearImage = async () => {
    try {
      await api.clearAvatarImage(profile.id);
      await refresh();
    } catch (e: any) { Alert.alert('Error', e?.message); }
  };

  const classPresets = PROMPT_PRESETS[profile.avatar_class] || PROMPT_PRESETS.knight;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Armory & Locker" subtitle="Forge thy legend" />
      <ScrollView contentContainerStyle={styles.container}>
        <SectionTitle icon="sparkles">Custom Hero Portrait</SectionTitle>
        <Parchment style={{ alignItems: 'center' }}>
          <AvatarView avatarClass={profile.avatar_class} avatarImage={profile.avatar_image} size={140} borderWidth={4} radius={16} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <GoldButton
              label="Generate with AI"
              icon="auto-fix"
              onPress={() => setGenOpen(true)}
              testID="open-avatar-gen"
              small
              style={{ flex: 1 }}
            />
            {profile.avatar_image ? (
              <GoldButton label="Use Class Icon" variant="stone" icon="close" onPress={clearImage} testID="clear-avatar" small style={{ flex: 1 }} />
            ) : null}
          </View>
        </Parchment>

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
          return (
            <View key={slot}>
              <SectionTitle icon={SLOT_ICON[slot]}>{SLOT_LABEL[slot]}</SectionTitle>
              {gear.length === 0 ? (
                <StoneCard><Text style={styles.empty}>Unlock {slot}s by leveling up!</Text></StoneCard>
              ) : (
                <View style={styles.gearGrid}>
                  {gear.map((g) => {
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

      <Modal visible={genOpen} animationType="slide" transparent onRequestClose={() => !generating && setGenOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Summon Thy Portrait</Text>
            <Text style={styles.hint}>Describe your hero — hair, armor, weapons, style.</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. red-haired knight with dragon shield"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              multiline
              numberOfLines={3}
              editable={!generating}
              testID="avatar-prompt"
            />
            <Text style={[styles.hint, { marginTop: 10 }]}>Quick inspiration for {AVATAR_ASSETS[profile.avatar_class]?.label}:</Text>
            <View style={styles.presetRow}>
              {classPresets.map((p) => (
                <Pressable key={p} onPress={() => setPrompt(p)} disabled={generating} style={styles.presetChip}>
                  <Text style={styles.presetText} numberOfLines={2}>{p}</Text>
                </Pressable>
              ))}
            </View>
            {generating ? (
              <View style={styles.genLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.genText}>Summoning your hero... this takes ~15s</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <GoldButton label="Cancel" variant="stone" onPress={() => setGenOpen(false)} style={{ flex: 1 }} />
                <GoldButton label="Summon" icon="auto-fix" onPress={generate} style={{ flex: 1 }} testID="gen-submit" />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const SLOT_LABEL: Record<Slot, string> = { weapon: 'Weapons', shield: 'Shields', helmet: 'Helmets', cape: 'Capes' };
const SLOT_ICON: Record<Slot, string> = { weapon: 'sword', shield: 'shield', helmet: 'crown-outline', cape: 'tshirt-crew' };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 14, paddingBottom: 40 },
  classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  classCard: { width: '48%', backgroundColor: colors.parchment, borderWidth: 2, borderColor: colors.primaryDark, borderRadius: 10, padding: 12, alignItems: 'center' },
  classAvatar: { width: 64, height: 64, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  className: { color: colors.ink, fontSize: 15, fontWeight: '900', fontFamily: 'Georgia', marginTop: 6 },
  classTag: { color: colors.inkMuted, fontSize: 10, fontStyle: 'italic' },
  equippedDot: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  gearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  gearCard: { width: '31%', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.stoneLight, borderRadius: 8, padding: 10, alignItems: 'center' },
  gearName: { color: colors.parchment, fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  gearLv: { color: colors.inkMuted, fontSize: 10, marginTop: 2 },
  equippedText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
  empty: { color: colors.inkMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 2, borderTopColor: colors.primary, maxHeight: '90%' },
  modalTitle: { color: colors.primary, fontSize: 22, fontWeight: '900', fontFamily: 'Georgia', letterSpacing: 1, marginBottom: 10 },
  hint: { color: colors.inkMuted, fontSize: 12, fontStyle: 'italic' },
  input: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.stoneLight, borderRadius: 8, padding: 10, color: colors.parchment, fontSize: 14, marginTop: 8, minHeight: 70, textAlignVertical: 'top' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  presetChip: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.primaryDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, maxWidth: '48%' },
  presetText: { color: colors.parchment, fontSize: 11 },
  genLoading: { alignItems: 'center', paddingVertical: 24 },
  genText: { color: colors.parchment, marginTop: 10, fontStyle: 'italic', fontSize: 12 },
});
