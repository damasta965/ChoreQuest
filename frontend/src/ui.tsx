import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius } from './theme';

export function Parchment({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.parchment, style]}>{children}</View>;
}

export function StoneCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.stone, style]}>{children}</View>;
}

export function GoldButton({
  label,
  onPress,
  disabled,
  testID,
  variant = 'gold',
  icon,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  variant?: 'gold' | 'burgundy' | 'forest' | 'stone' | 'danger';
  icon?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const bg = {
    gold: colors.primary,
    burgundy: colors.burgundy,
    forest: colors.forest,
    stone: colors.stone,
    danger: colors.danger,
  }[variant];
  const border = {
    gold: colors.primaryDark,
    burgundy: colors.burgundyDark,
    forest: '#1E331F',
    stone: colors.inkBrown,
    danger: colors.dangerDark,
  }[variant];
  const textColor = variant === 'gold' ? colors.ink : colors.parchment;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderBottomColor: border, borderRightColor: border },
        pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2, borderRightWidth: 2 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon as any} size={small ? 16 : 20} color={textColor} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.btnLabel, small && styles.btnLabelSmall, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <View style={styles.sectionTitle}>
      {icon ? <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} style={{ marginRight: 8 }} /> : null}
      <Text style={styles.sectionTitleText}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

export function XPBar({ xp, nextThreshold, rankThreshold }: { xp: number; nextThreshold: number | null; rankThreshold: number }) {
  let pct = 1;
  if (nextThreshold) {
    const span = nextThreshold - rankThreshold;
    const curr = xp - rankThreshold;
    pct = Math.max(0.02, Math.min(1, curr / span));
  }
  return (
    <View style={styles.xpBarOuter}>
      <View style={styles.xpBarTrack}>
        <View style={[styles.xpBarFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

export function StatChip({ icon, label, color = colors.primary }: { icon: string; label: string; color?: string }) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} style={{ marginRight: 4 }} />
      <Text style={[styles.chipText, { color: colors.parchment }]}>{label}</Text>
    </View>
  );
}

export function HeaderBanner({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.bannerSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  parchment: {
    backgroundColor: colors.parchment,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderRadius: radius.md,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  stone: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.stoneLight,
    borderRadius: radius.md,
    padding: 14,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    minHeight: 48,
  },
  btnSmall: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, borderBottomWidth: 3, borderRightWidth: 3 },
  btnLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'Georgia',
  },
  btnLabelSmall: { fontSize: 13 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitleText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'Georgia',
    textTransform: 'uppercase',
  },
  sectionRule: { flex: 1, height: 1, backgroundColor: colors.primaryDark, marginLeft: 12, opacity: 0.5 },
  xpBarOuter: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.pill, padding: 2, backgroundColor: '#0d0f0c' },
  xpBarTrack: { height: 12, backgroundColor: '#0d0f0c', borderRadius: radius.pill, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: colors.forestBright, borderRadius: radius.pill },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    backgroundColor: colors.burgundyDark,
  },
  bannerTitle: { color: colors.parchment, fontSize: 22, fontWeight: '800', letterSpacing: 1, fontFamily: 'Georgia' },
  bannerSub: { color: colors.parchmentDark, fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: colors.stoneLight, marginVertical: 12 },
});
