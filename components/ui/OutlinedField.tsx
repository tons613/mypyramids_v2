import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { useAuthTheme } from '@/hooks/use-auth-theme';

type Props = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
};

export function OutlinedField({ label, icon, isPassword, ...input }: Props) {
  const [hidden, setHidden] = useState(!!isPassword);
  const auth = useAuthTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: auth.accentDeep }]}>{label}</Text>
      <View style={[styles.box, { borderColor: auth.fieldBorder, backgroundColor: auth.fieldBg }]}>
        {icon ? <Ionicons name={icon} size={18} color={auth.accent} /> : null}
        <TextInput
          placeholderTextColor={auth.placeholder}
          style={[styles.input, { color: auth.heading }]}
          secureTextEntry={hidden}
          autoCapitalize={isPassword ? 'none' : input.autoCapitalize}
          {...input}
        />
        {isPassword ? (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden((v) => !v)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={auth.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 14, marginBottom: 6, fontWeight: '500' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
});
