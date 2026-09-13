import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../lib/format';

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
}) {
  const styleMap: Record<BtnVariant, Record<string, unknown>> = {
    primary: { backgroundColor: COLORS.primary },
    secondary: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1 },
    danger: { backgroundColor: COLORS.danger },
    ghost: { backgroundColor: 'transparent' },
  };
  const textMap: Record<BtnVariant, { color: string }> = {
    primary: { color: '#fff' },
    secondary: { color: COLORS.text },
    danger: { color: '#fff' },
    ghost: { color: COLORS.muted },
  };
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        styleMap[variant],
        (pressed || disabled) && styles.btnPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.btnText, textMap[variant]]}>{title}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={COLORS.muted}
        {...props}
      />
    </View>
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const bg =
    kind === 'error' ? '#fdecec' : kind === 'success' ? '#e9f7ef' : '#eef2ff';
  const color =
    kind === 'error' ? COLORS.dangerDark : kind === 'success' ? COLORS.primaryDark : '#3b4f9e';
  return (
    <View style={[styles.alert, { backgroundColor: bg }]}>
      <Text style={{ color }}>{children}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={COLORS.primary} />
      <Text style={styles.loadingText}>Cargando…</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <Text style={styles.empty}>{message}</Text>;
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.6,
  },
  btnText: {
    fontWeight: '700',
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  alert: {
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: COLORS.muted,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 32,
  },
});