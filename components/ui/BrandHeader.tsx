import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export function BrandHeader() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.wrap}>
      <Image
        source={isDark ? require('@/assets/images/logo-dark.png') : require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  logo: {
    width: 210,
    height: 72,
  },
});
