import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import App from './App';
import { Toaster } from './components/Toaster';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
    <StrictMode>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <WalletConnectProvider>
                <App />
                <Toaster />
            </WalletConnectProvider>
        </ThemeProvider>
    </StrictMode>,
);
