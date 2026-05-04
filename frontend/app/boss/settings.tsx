import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, Profile } from '../../src/api';
import { colors } from '../../src/theme';
import { Parchment, HeaderBanner, GoldButton, SectionTitle } from '../../src/ui';
import { AvatarView } from '../../src/AvatarView';

export default function Settings() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pinModal, setPinModal] = useState<{ profile: Profile; newPin: string; confirmPin: string; bossPin: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const p = await api.listProfiles();
    setProfiles(p);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openChange = (p: Profile) => {
    setPinModal({ profile: p, newPin: '', confirmPin: '', bossPin: '' });
  };

  const submit = async () => {
    if (!pinModal) return;
    const { profile, newPin, confirmPin, bossPin } = pinModal;
    if (newPin.length !== 4) { Alert.alert('PIN must be 4 digits'); return; }
    if (newPin !== confirmPin) { Alert.alert('PINs do not match'); return; }
    if (bossPin.length !== 4) { Alert.alert('Enter current Boss PIN'); return; }
    setBusy(true);
    try {
      await api.changePin(profile.id, newPin, bossPin);
      setPinModal(null);
      Alert.alert('PIN Changed', `${profile.name}'s PIN is now updated.`);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Boss Settings" subtitle="Change PINs & secrets" />
      <ScrollView contentContainerStyle={styles.container}>
        <SectionTitle icon="key-variant">Sacred Seals (PINs)</SectionTitle>
        <Text style={styles.note}>Requires your current Boss PIN to confirm any change.</Text>

        {profiles.map((p) => (
          <Parchment key={p.id} style={styles.card} testID={`settings-card-${p.name}`}>
            <View style={styles.row}>
              <AvatarView avatarClass={p.avatar_class} avatarImage={p.avatar_image} size={54} borderWidth={3} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.sub}>{p.role === 'boss' ? 'Ruler of the Realm' : 'Hero'}</Text>
              </View>
              <GoldButton
                label="Change PIN"
                icon="key"
                variant={p.role === 'boss' ? 'burgundy' : 'gold'}
                onPress={() => openChange(p)}
                testID={`change-pin-${p.name}`}
                small
              />
            </View>
          </Parchment>
        ))}

        <View style={{ height: 20 }} />
        <Text style={styles.note}>💡 Tip: If a kid forgets their PIN, come here and reset it. Boss PIN is the master key.</Text>
      </ScrollView>

      <Modal visible={!!pinModal} transparent animationType="slide" onRequestClose={() => !busy && setPinModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Change {pinModal?.profile.name}'s PIN</Text>

            <Text style={styles.label}>New 4-digit PIN</Text>
            <TextInput
              value={pinModal?.newPin || ''}
              onChangeText={(v) => pinModal && setPinModal({ ...pinModal, newPin: v.replace(/\D/g, '').slice(0, 4) })}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={colors.inkMuted}
              testID="settings-new-pin"
            />

            <Text style={styles.label}>Confirm New PIN</Text>
            <TextInput
              value={pinModal?.confirmPin || ''}
              onChangeText={(v) => pinModal && setPinModal({ ...pinModal, confirmPin: v.replace(/\D/g, '').slice(0, 4) })}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={colors.inkMuted}
              testID="settings-confirm-pin"
            />

            <Text style={styles.label}>Current Boss PIN (to authorize)</Text>
            <TextInput
              value={pinModal?.bossPin || ''}
              onChangeText={(v) => pinModal && setPinModal({ ...pinModal, bossPin: v.replace(/\D/g, '').slice(0, 4) })}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={colors.inkMuted}
              testID="settings-boss-pin"
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <GoldButton label="Cancel" variant="stone" onPress={() => setPinModal(null)} disabled={busy} style={{ flex: 1 }} />
              <GoldButton label={busy ? '...' : 'Save'} icon="check" onPress={submit} disabled={busy} testID="settings-save" style={{ flex: 1 }} />
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
  note: { color: colors.inkMuted, fontSize: 12, fontStyle: 'italic', marginBottom: 10 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: colors.ink, fontSize: 17, fontWeight: '900', fontFamily: 'Georgia' },
  sub: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 2, borderTopColor: colors.primary },
  modalTitle: { color: colors.primary, fontSize: 20, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 10 },
  label: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4, letterSpacing: 1 },
  input: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.stoneLight, borderRadius: 8, padding: 12, color: colors.parchment, fontSize: 18, textAlign: 'center', letterSpacing: 8, fontWeight: '900' },
});
