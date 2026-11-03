import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function iconNameFor(label: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  const n = label.toLowerCase();
  if (n.includes('skull')) return 'skull-outline';
  if (n.includes('foot') || n.includes('ankle')) return 'shoe-print';
  if (n.includes('spine') || n.includes('lumbo') || n.includes('bone')) return 'bone';
  if (n.includes('ecg') || n.includes('electro') || n.includes('heart')) return 'heart-pulse';
  if (n.includes('chest') || n.includes('lung') || n.includes('x-ray') || n.includes('xray')) return 'lungs';
  if (n.includes('ultra')) return 'waveform';
  if (n.includes('haem') || n.includes('blood')) return 'test-tube';
  if (n.includes('bact') || n.includes('micro')) return 'microscope';
  if (n.includes('horm') || n.includes('molec')) return 'molecule';
  if (n.includes('paras') || n.includes('myco')) return 'bacteria';
  if (n.includes('chem') || n.includes('path') || n.includes('lab')) return 'flask-outline';
  return 'flask-outline';
}

export function CategoryGlyph({ label, size = 28 }: { label: string; size?: number }) {
  const palette = Colors[useColorScheme()];
  return (
    <View style={[styles.tile, { backgroundColor: palette.accent }]}>
      <MaterialCommunityIcons name={iconNameFor(label)} size={size} color={palette.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
