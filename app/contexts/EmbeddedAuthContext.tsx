'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { 
  initialize, 
  signInWithEmail, 
  verifyEmailOTP, 
  getCurrentUser, 
  isSignedIn, 
  signOut,
  onAuthStateChange,
  User
} from '@coinbase/cdp-core';

// Context value type
interface EmbeddedAuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  // Auth flow states
  isSigningIn: boolean;
  currentFlowId: string | null;
  // Auth actions
  startSignIn: (email: string) => Promise<{ success: boolean; flowId?: string; error?: string }>;
  verifyOTP: (otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearSignInFlow: () => void;
}

// Create meaningful default values
const defaultEmbeddedAuthContext: EmbeddedAuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  isSigningIn: false,
  currentFlowId: null,
  startSignIn: async () => {
    throw new Error('startSignIn must be used within an EmbeddedAuthProvider');
  },
  verifyOTP: async () => {
    throw new Error('verifyOTP must be used within an EmbeddedAuthProvider');
  },
  logout: async () => {
    throw new Error('logout must be used within an EmbeddedAuthProvider');
  },
  clearSignInFlow: () => {
    throw new Error('clearSignInFlow must be used within an EmbeddedAuthProvider');
  }
};

// Create the context
const EmbeddedAuthContext = createContext<EmbeddedAuthContextValue>(defaultEmbeddedAuthContext);

// Provider component
interface EmbeddedAuthProviderProps {
  children: ReactNode;
}

export const EmbeddedAuthProvider: React.FC<EmbeddedAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);

  // Initialize CDP SDK
  const initializeSDK = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get CDP configuration from config endpoint
      const response = await fetch('/api/auth/config');
      const config = await response.json();
      
      if (!config.cdpProjectId) {
        console.error('CDP Project ID not configured');
        return false;
      }
      
      console.log('Initializing CDP Core with project ID:', config.cdpProjectId);
      
      // Initialize the CDP core package
      await initialize({
        projectId: config.cdpProjectId
      });
      
      console.log('CDP SDK initialized successfully');
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error('Error initializing CDP SDK:', error);
      setIsInitialized(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check current auth status
  const checkAuthStatus = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      const signedIn = await isSignedIn();
      
      if (signedIn) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        console.log('User is authenticated:', currentUser);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log('User is not authenticated');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [isInitialized]);

  // Start email sign-in process
  const startSignIn = useCallback(async (email: string) => {
    if (!isInitialized) {
      return { success: false, error: 'SDK not initialized' };
    }

    try {
      setIsSigningIn(true);
      const result = await signInWithEmail({ email });
      
      setCurrentFlowId(result.flowId);
      console.log('Sign-in flow started for:', email);
      
      return { success: true, flowId: result.flowId };
    } catch (error) {
      console.error('Error starting sign-in:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsSigningIn(false);
    }
  }, [isInitialized]);

  // Verify OTP
  const verifyOTP = useCallback(async (otp: string) => {
    if (!currentFlowId) {
      return { success: false, error: 'No active sign-in flow' };
    }

    try {
      setIsLoading(true);
      
      const result = await verifyEmailOTP({
        flowId: currentFlowId,
        otp
      });

      if (result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        setCurrentFlowId(null);
        console.log('OTP verified successfully:', result.user);
        return { success: true };
      } else {
        return { success: false, error: 'Verification failed' };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid OTP' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [currentFlowId]);

  // Logout
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await signOut();
      
      setUser(null);
      setIsAuthenticated(false);
      setCurrentFlowId(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear sign-in flow
  const clearSignInFlow = useCallback(() => {
    setCurrentFlowId(null);
    setIsSigningIn(false);
  }, []);

  // Initialize SDK on mount
  useEffect(() => {
    initializeSDK();
  }, [initializeSDK]);

  // Check auth status when SDK is initialized
  useEffect(() => {
    if (isInitialized) {
      checkAuthStatus();
    }
  }, [isInitialized, checkAuthStatus]);

  // Listen for auth state changes
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = onAuthStateChange((newUser) => {
      if (newUser) {
        setUser(newUser);
        setIsAuthenticated(true);
        console.log('Auth state changed - user signed in:', newUser);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log('Auth state changed - user signed out');
      }
    });

    return unsubscribe;
  }, [isInitialized]);

  // Memoize context value
  const contextValue = useMemo<EmbeddedAuthContextValue>(() => ({
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    isSigningIn,
    currentFlowId,
    startSignIn,
    verifyOTP,
    logout,
    clearSignInFlow
  }), [
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    isSigningIn,
    currentFlowId,
    startSignIn,
    verifyOTP,
    logout,
    clearSignInFlow
  ]);

  return (
    <EmbeddedAuthContext.Provider value={contextValue}>
      {children}
    </EmbeddedAuthContext.Provider>
  );
};

// Custom hook
export const useEmbeddedAuth = (): EmbeddedAuthContextValue => {
  const context = useContext(EmbeddedAuthContext);
  
  if (context === defaultEmbeddedAuthContext) {
    console.warn('useEmbeddedAuth is being used outside of EmbeddedAuthProvider. Using default values.');
  }
  
  return context;
};

// Export context for advanced use cases
export { EmbeddedAuthContext }; 