import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LAN_API_BASE: string =
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  'http://192.168.133.84:3000/api/v1';

export const API_BASE: string =
  Platform.OS === 'web' ? 'http://localhost:3000/api/v1' : LAN_API_BASE;