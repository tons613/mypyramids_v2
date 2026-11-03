import AsyncStorage from '@react-native-async-storage/async-storage';

export type CachedChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  sender: 'doctor' | 'patient';
  recommendations?: string[];
};

const cacheKeyFor = (userId: string) => `chat-history:${userId}`;

export async function loadChatMessages(userId: string): Promise<CachedChatMessage[]> {
  try {
    const serialized = await AsyncStorage.getItem(cacheKeyFor(userId));
    if (!serialized) return [];
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CachedChatMessage => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return typeof record.id === 'string' && typeof record.text === 'string' &&
        typeof record.createdAt === 'string' &&
        (record.sender === 'doctor' || record.sender === 'patient');
    });
  } catch {
    return [];
  }
}

export async function saveChatMessages(userId: string, messages: CachedChatMessage[]) {
  try {
    await AsyncStorage.setItem(cacheKeyFor(userId), JSON.stringify(messages));
  } catch {
    // Chat remains usable if local storage is unavailable.
  }
}

export async function clearChatMessages(userId: string) {
  await AsyncStorage.removeItem(cacheKeyFor(userId));
}
