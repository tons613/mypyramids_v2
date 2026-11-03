import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function StackHeader({ title, onBack, right }: Props) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack || (() => router.back())} style={styles.back} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color="#111" />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>{right || <View style={{ width: 36 }} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  right: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
});
