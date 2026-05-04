import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors } from '../src/theme';
import { useSession } from '../src/session';

export default function PinScreen() {
  const router = useRouter();
  const { profileId, name, role } = useLocalSearchParams<{ profileId: string; name: string; role: string }>();
  const { setProfile } = useSession();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const submit = async (val: string) => {
    if (val.length !== 4) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.verifyPin(profileId as string, val);
      setProfile(res.profile);
      if (res.profile.role === 'boss') {
        router.replace('/boss/approvals');
      } else {
        router.replace('/hero/dashboard');
      }
    } catch (e: any) {
      setError(e?.message || 'Incorrect PIN');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  const onChange = (t: string) => {
    const clean = t.replace(/\D/g, '').slice(0, 4);
    setPin(clean);
    setError('');
    if (clean.length === 4) submit(clean);
  };

  const isBoss = role === 'boss';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={styles.close} onPress={() => router.back()} testID="pin-close">
          <MaterialCommunityIcons name="close" size={26} color={colors.parchment} />
        </Pressable>
        <View style={styles.body}>
          <MaterialCommunityIcons name={isBoss ? 'crown' : 'shield-sword'} size={56} color={colors.primary} />
          <Text style={styles.prompt}>Enter Sacred Seal</Text>
          <Text style={styles.name} testID="pin-profile-name">{name}</Text>

          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
            ))}
          </View>

          <TextInput
            ref={inputRef}
            value={pin}
            onChangeText={onChange}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            style={styles.hiddenInput}
            testID="pin-input"
            editable={!busy}
            autoFocus
          />

          <Pressable onPress={() => inputRef.current?.focus()} style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tap to enter PIN</Text>
          </Pressable>

          {error ? <Text style={styles.error} testID="pin-error">{error}</Text> : <Text style={styles.hint}>4-digit PIN</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  close: { position: 'absolute', top: 12, right: 16, zIndex: 5, padding: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  prompt: { color: colors.primary, fontSize: 22, fontFamily: 'Georgia', fontWeight: '800', letterSpacing: 2, marginTop: 18 },
  name: { color: colors.parchment, fontSize: 16, marginTop: 4, fontStyle: 'italic' },
  dots: { flexDirection: 'row', gap: 18, marginTop: 34, marginBottom: 20 },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.bg,
  },
  dotFilled: { backgroundColor: colors.primary },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  tapHint: { padding: 12 },
  tapHintText: { color: colors.inkMuted, fontSize: 12, letterSpacing: 1 },
  error: { color: '#FF6B6B', marginTop: 14, fontWeight: '700' },
  hint: { color: colors.inkMuted, marginTop: 14, fontSize: 12, letterSpacing: 1 },
});
