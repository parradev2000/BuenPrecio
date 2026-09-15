import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../lib/format';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

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
      {session ? (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(session.user.name)}</Text>
        </View>
      ) : (
        <Ionicons name="person-circle-outline" size={26} color={COLORS.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});