import { BrowserRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import esES from 'antd/locale/es_ES';
import { AuthProvider } from '../context/AuthContext';
import { Router } from '../App';
import { useTheme } from '../context/ThemeContext';
import { antdThemeFor } from '../theme';

export function ThemeRoot() {
  const { scheme } = useTheme();
  return (
    <StyleProvider layer>
      <ConfigProvider locale={esES} theme={antdThemeFor(scheme)}>
        <AntApp>
          <BrowserRouter>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  );
}