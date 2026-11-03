import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  success: boolean;
  onClose: () => void;
};

export function PaymentResultModal({ visible, success, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: success ? '#22C55E' : '#EF4444' }]}>
            <Ionicons name={success ? 'checkmark' : 'close'} size={42} color="#fff" />
          </View>
          <Text style={styles.title}>{success ? 'Payment Confirmed!' : 'Payment Declined'}</Text>
          <Text style={styles.body}>
            {success
              ? 'Your payment was successful.\nThank you for your purchase.'
              : 'Your payment was not successful.\nPlease try again.'}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(243, 232, 255, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: { alignItems: 'center' },
  badge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 15, color: '#4B5563', textAlign: 'center', lineHeight: 22 },
});
