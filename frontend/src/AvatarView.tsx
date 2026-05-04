import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { AVATAR_ASSETS, colors } from './theme';

export function AvatarView({
  avatarClass,
  avatarImage,
  size = 64,
  borderColor,
  borderWidth = 3,
  radius,
  style,
}: {
  avatarClass: string;
  avatarImage?: string | null;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const asset = AVATAR_ASSETS[avatarClass] || AVATAR_ASSETS.knight;
  const r = radius !== undefined ? radius : Math.round(size * 0.22);
  const bg = colors.bg;
  const bColor = borderColor || asset.color;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          borderWidth,
          borderColor: bColor,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {avatarImage ? (
        <Image source={{ uri: avatarImage }} style={{ width: size - borderWidth * 2, height: size - borderWidth * 2 }} resizeMode="cover" />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{asset.emoji}</Text>
      )}
    </View>
  );
}
