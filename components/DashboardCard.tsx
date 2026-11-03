import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card, Icon, Text, useTheme } from 'react-native-paper';

interface DashboardCardProps {
  title: string;
  icon: string;
  onPress: () => void;
  color?: string;
  gradientColors?: [string, string];
  style?: ViewStyle;
}

export default function DashboardCard({ title, icon, onPress, color, gradientColors, style }: DashboardCardProps) {
  const theme = useTheme();
  
  // Default gradient if none provided
  const colors = gradientColors || [theme.colors.surface, theme.colors.surface];
  const iconColor = gradientColors ? '#FFFFFF' : (color || theme.colors.primary);
  const textColor = gradientColors ? '#FFFFFF' : theme.colors.onSurface;

  return (
    <Card style={[styles.card, style]} onPress={onPress} mode="elevated">
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Card.Content style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: gradientColors ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }]}>
            <Icon source={icon} size={32} color={iconColor} />
          </View>
          <Text variant="titleMedium" style={[styles.title, { color: textColor }]}>
            {title}
          </Text>
        </Card.Content>
      </LinearGradient>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    paddingVertical: 8,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 50,
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
  },
});
