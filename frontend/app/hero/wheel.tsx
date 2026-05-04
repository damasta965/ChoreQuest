import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../src/session';
import { api } from '../../src/api';
import { colors } from '../../src/theme';
import { HeaderBanner, GoldButton, Parchment, StoneCard } from '../../src/ui';

export default function WheelScreen() {
  const { profile, refresh } = useSession();
  const [rewards, setRewards] = useState<any[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const totalRotation = useRef(0);

  useEffect(() => {
    api.wheelRewards().then(setRewards);
  }, []);

  if (!profile) return null;

  const spin = async () => {
    if (spinning || profile.wheel_spins <= 0) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await api.spinWheel(profile.id);
      // find index
      const idx = rewards.findIndex((r) => r.id === res.reward.id);
      const segAngle = 360 / rewards.length;
      const targetAngle = 360 * 6 + (360 - (idx * segAngle + segAngle / 2));
      totalRotation.current += targetAngle;
      Animated.timing(rotation, {
        toValue: totalRotation.current,
        duration: 3600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(async () => {
        setResult(res.reward);
        setSpinning(false);
        await refresh();
      });
    } catch (e: any) {
      Alert.alert('Cannot spin', e?.message);
      setSpinning(false);
    }
  };

  const rotateStyle = {
    transform: [{ rotate: rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }],
  };

  const segAngle = rewards.length ? 360 / rewards.length : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBanner title="Wheel of Fate" subtitle="Fortune favors the bold" />
      <View style={styles.container}>
        <StoneCard style={styles.spinsCard}>
          <MaterialCommunityIcons name="compass-rose" size={22} color="#9B59FF" />
          <Text style={styles.spinsText}>
            You have <Text style={{ color: colors.primary, fontWeight: '900' }}>{profile.wheel_spins}</Text> spin{profile.wheel_spins === 1 ? '' : 's'}
          </Text>
        </StoneCard>

        <View style={styles.wheelWrap}>
          <View style={styles.pointer}>
            <MaterialCommunityIcons name="triangle" size={32} color={colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
          </View>
          <View style={styles.wheelOuter}>
            <Animated.View style={[styles.wheel, rotateStyle]}>
              {rewards.map((r, i) => {
                const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
                return (
                  <View
                    key={r.id}
                    style={[
                      styles.segment,
                      {
                        transform: [{ rotate: `${i * segAngle}deg` }],
                        backgroundColor: color,
                      },
                    ]}
                  >
                    <Text style={styles.segmentLabel} numberOfLines={2}>{r.label}</Text>
                  </View>
                );
              })}
              <View style={styles.hub}>
                <MaterialCommunityIcons name="star-four-points" size={24} color={colors.primary} />
              </View>
            </Animated.View>
          </View>
        </View>

        <GoldButton
          testID="spin-btn"
          label={spinning ? 'Spinning...' : profile.wheel_spins > 0 ? 'SPIN THE WHEEL' : 'Earn Spins via Streaks'}
          onPress={spin}
          disabled={spinning || profile.wheel_spins <= 0}
          icon="compass-rose"
          style={{ marginTop: 16 }}
        />

        {result ? (
          <Parchment style={styles.resultCard} testID="wheel-result">
            <MaterialCommunityIcons name="gift" size={36} color={colors.primary} />
            <Text style={styles.resultTitle}>Thou hast won!</Text>
            <Text style={styles.resultValue}>{result.label}</Text>
          </Parchment>
        ) : (
          <Text style={styles.hint}>3-day streak = 1 spin · 7-day streak = 2 spins · 14-day streak = 3 spins</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const WHEEL_COLORS = ['#722F37', '#D4AF37', '#2E4A35', '#2A3B4C', '#8B2E3D', '#A3862C', '#4A1D24', '#6A4A8C'];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 16, alignItems: 'center' },
  spinsCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  spinsText: { color: colors.parchment, fontSize: 14, fontWeight: '700' },
  wheelWrap: { alignItems: 'center', justifyContent: 'center' },
  pointer: { position: 'absolute', top: -6, zIndex: 10 },
  wheelOuter: {
    width: 280, height: 280, borderRadius: 140,
    borderWidth: 6, borderColor: colors.primary,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  wheel: { width: 268, height: 268, borderRadius: 134, alignItems: 'center', justifyContent: 'center' },
  segment: {
    position: 'absolute',
    width: 134, height: 134,
    left: 134, top: 0,
    transformOrigin: '0% 100%',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.3)',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingLeft: 14,
  },
  segmentLabel: { color: '#fff', fontSize: 9, fontWeight: '800', maxWidth: 54, textShadowColor: '#000', textShadowRadius: 2 },
  hub: {
    position: 'absolute',
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bg,
    borderWidth: 3, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  resultCard: { marginTop: 20, alignItems: 'center', padding: 20, width: '100%' },
  resultTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', fontFamily: 'Georgia', letterSpacing: 1, marginTop: 6 },
  resultValue: { color: colors.burgundy, fontSize: 22, fontWeight: '900', fontFamily: 'Georgia', marginTop: 4 },
  hint: { color: colors.inkMuted, fontSize: 11, fontStyle: 'italic', marginTop: 20, textAlign: 'center', paddingHorizontal: 20 },
});
