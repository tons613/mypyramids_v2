import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export function BrandHeader() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.wrap}>
      {/* The wordmark is dark navy, so it needs a light plate on dark surfaces. */}
      <View style={isDark ? styles.plate : undefined}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  plate: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  logo: {
    width: 210,
    height: 72,
  },
});
