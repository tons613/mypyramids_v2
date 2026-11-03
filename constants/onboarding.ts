import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'hasSeenOnboarding';
let seenCache: boolean | null = null;

export async function loadOnboardingSeen() {
  if (seenCache !== null) return seenCache;
  seenCache = (await AsyncStorage.getItem(KEY)) === '1';
  return seenCache;
}

export async function markOnboardingSeen() {
  seenCache = true;
  await AsyncStorage.setItem(KEY, '1');
}
