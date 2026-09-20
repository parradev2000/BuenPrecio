import type { ThemeConfig } from 'antd';

/**
 * Design tokens for the modern Buen Precio redesign.
 * Keep these in sync with the `@theme` block in `tailwind.css`.
 */
export const palette = {
  brand: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  accent: {
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },
  ink: '#0f172a',
  muted: '#64748b',
  surface: '#ffffff',
  bg: '#f8fafc',
  border: '#e2e8f0',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  successBg: '#ecfdf5',
  successFg: '#047857',
  warningBg: '#fffbeb',
  warningFg: '#b45309',
};

export const FONT_FAMILY =
  "'Inter Variable', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: palette.brand[600],
    colorInfo: palette.brand[600],
    colorSuccess: palette.brand[600],
    colorWarning: palette.accent[500],
    colorError: palette.danger,
    colorTextBase: palette.ink,
    borderRadius: 10,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: palette.surface,
      headerHeight: 60,
      headerPadding: '0 16px',
      bodyBg: palette.bg,
      footerBg: palette.surface,
    },
    Menu: {
      itemBg: 'transparent',
    },
    Card: {
      borderRadiusLG: 14,
    },
    Table: {
      headerBg: palette.bg,
    },
  },
};
