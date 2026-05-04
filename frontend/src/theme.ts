export const colors = {
  primary: '#D4AF37',
  primaryDark: '#A3862C',
  burgundy: '#722F37',
  burgundyDark: '#4A1D24',
  bg: '#1A1C19',
  bgElevated: '#25261F',
  bgCard: '#2A2B24',
  parchment: '#F4EBD0',
  parchmentDark: '#E2D4B2',
  parchmentDeep: '#C8B790',
  inkBrown: '#3A2818',
  ink: '#2C2C2C',
  inkMuted: '#5E5345',
  forest: '#2E4A35',
  forestBright: '#4CAF50',
  midnight: '#2A3B4C',
  danger: '#B33A3A',
  dangerDark: '#7A2424',
  gold: '#D4AF37',
  goldLight: '#F5D76E',
  stone: '#3A3B33',
  stoneLight: '#4A4B43',
};

export const fonts = {
  display: 'Georgia',
  body: 'System',
};

export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  pill: 999,
};

export const AVATAR_ASSETS: Record<string, { label: string; emoji: string; color: string; tagline: string }> = {
  knight: { label: 'Knight', emoji: '⚔️', color: '#C8A951', tagline: 'Steadfast Defender' },
  archer: { label: 'Archer', emoji: '🏹', color: '#4C7A3A', tagline: 'Swift Ranger' },
  mage: { label: 'Mage', emoji: '🔮', color: '#6A4A8C', tagline: 'Arcane Scholar' },
  rogue: { label: 'Rogue', emoji: '🗡️', color: '#8B2E3D', tagline: 'Shadow Blade' },
};

export const RANK_COLORS: Record<string, string> = {
  Peasant: '#8B7355',
  Squire: '#B8926A',
  Knight: '#C0C0C0',
  Champion: '#D4AF37',
  Hero: '#9B30FF',
  Legend: '#FF4500',
};

export const RANK_THRESHOLDS: Record<string, number> = {
  Peasant: 0,
  Squire: 100,
  Knight: 300,
  Champion: 700,
  Hero: 1500,
  Legend: 3000,
};
