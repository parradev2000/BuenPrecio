import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { COLORS } from '../lib/format';

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BTN_BG: Record<BtnVariant, string> = {
  primary: 'bg-brand-600',
  secondary: 'bg-white border border-edge',
  danger: 'bg-red-600',
  ghost: 'bg-transparent',
};

const BTN_TEXT: Record<BtnVariant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  danger: 'text-white',
  ghost: 'text-muted',
};

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
  return (
    <Pressable
      className={`items-center justify-center rounded-xl px-4 py-3 active:opacity-70 ${BTN_BG[variant]} ${
        disabled ? 'opacity-60' : ''
      }`}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className={`font-bold ${BTN_TEXT[variant]}`}>{title}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-[13px] font-semibold text-muted">{label}</Text>
      <TextInput
        className="rounded-xl border border-edge bg-white px-3 py-2.5 text-base text-ink"
        placeholderTextColor={COLORS.muted}
        {...props}
      />
    </View>
  );
}

const ALERT_BG = {
  error: 'bg-red-50',
  success: 'bg-brand-50',
  info: 'bg-indigo-50',
} as const;

const ALERT_TEXT = {
  error: 'text-red-700',
  success: 'text-brand-700',
  info: 'text-indigo-700',
} as const;

export function Alert({
  kind,
  children,
}: {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  return (
    <View className={`my-2 rounded-xl p-3 ${ALERT_BG[kind]}`}>
      <Text className={ALERT_TEXT[kind]}>{children}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View className="items-center gap-2 py-10">
      <ActivityIndicator color={COLORS.primary} />
      <Text className="text-muted">Cargando…</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <Text className="py-8 text-center text-muted">{message}</Text>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`gap-2 rounded-2xl border border-edge bg-white p-4 ${className}`}>
      {children}
    </View>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <View className="flex-1 bg-canvas p-4">{children}</View>;
}
