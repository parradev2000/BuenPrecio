import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../lib/format';

export function AccountHeaderButton() {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <Pressable
      hitSlop={12}
      onPress={() => router.push(session ? '/account' : '/login')}
      style={{ padding: 4 }}
      accessibilityLabel={session ? 'Mi cuenta' : 'Entrar'}
    >
      <Ionicons
        name={session ? 'person-circle' : 'person-circle-outline'}
        size={26}
        color={session ? COLORS.primary : COLORS.muted}
      />
    </Pressable>
  );
}