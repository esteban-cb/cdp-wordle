'use client';

import React, { ReactNode } from 'react';
import { EmbeddedAuthProvider } from './EmbeddedAuthContext';
import { EmbeddedWalletProvider } from './EmbeddedWalletContext';
import { GameProvider } from './GameContext';
import { NetworkProvider } from './NetworkContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Combined provider component that wraps all React contexts for the CDP Wordle application.
 * 
 * This component follows the official React pattern for managing multiple contexts as documented
 * at https://react.dev/reference/react/createContext#consuming-multiple-contexts
 * 
 * The provider hierarchy is intentional:
 * 1. EmbeddedAuthProvider - Manages user authentication with embedded wallet (outermost)
 * 2. NetworkProvider - Manages network switching (depends on auth)
 * 3. EmbeddedWalletProvider - Manages embedded wallet operations (depends on auth and network)
 * 4. GameProvider - Manages game state (innermost, may depend on wallet)
 * 
 * @param children - React components that will have access to all contexts
 * @returns JSX element with nested context providers
 * 
 * @example
 * ```tsx
 * // In your root layout or App component:
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AppProviders>
 *           {children}
 *         </AppProviders>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <EmbeddedAuthProvider>
      <NetworkProvider>
        <EmbeddedWalletProvider>
          <GameProvider>
            {children}
          </GameProvider>
        </EmbeddedWalletProvider>
      </NetworkProvider>
    </EmbeddedAuthProvider>
  );
};

/**
 * Type exports for advanced use cases (testing, etc.)
 */
export type { AppProvidersProps }; 