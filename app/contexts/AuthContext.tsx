'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';

// Types for user data
interface UserMetadata {
  username?: string;
  [key: string]: unknown;
}

interface PassageUser {
  id: string;
  email?: string;
  display_name?: string;
  userMetadata?: UserMetadata;
  [key: string]: unknown;
}

interface UserInfo {
  id: string;
  displayName: string;
  email?: string;
}

// Context value type
interface AuthContextValue {
  userInfo: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: PassageUser) => void;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

// Create meaningful default values as per React docs
const defaultAuthContext: AuthContextValue = {
  userInfo: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {
    throw new Error('login must be used within an AuthProvider');
  },
  logout: async () => {
    throw new Error('logout must be used within an AuthProvider');
  },
  checkAuthStatus: async () => {
    throw new Error('checkAuthStatus must be used within an AuthProvider');
  }
};

// Create the context with meaningful default values
const AuthContext = createContext<AuthContextValue>(defaultAuthContext);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const login = useCallback((userData: PassageUser) => {
    // Use display_name from the API or fall back to other options
    const displayName = userData.display_name || 
                       (userData.userMetadata as { username?: string })?.username || 
                       userData.username as string || 
                       (userData.email as string)?.split('@')[0] || 
                       (userData.id as string).substring(0, 8);
    
    const user: UserInfo = {
      id: userData.id,
      displayName,
      email: userData.email as string
    };
    
    setUserInfo(user);
    setIsAuthenticated(true);
    setIsLoading(false);
    console.log('User authenticated with prepared data:', userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (res.ok) {
        setUserInfo(null);
        setIsAuthenticated(false);
        console.log('User logged out successfully');
      }
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    if (hasCheckedAuth && !isLoading) return; // Prevent duplicate calls
    
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/user');
      const data = await res.json();
      
      if (data.authenticated && data.user) {
        console.log('User authenticated:', data.user);
        
        // Get the display name prioritizing userMetadata.username
        const displayName = data.user.display_name || 
                          data.user.userMetadata?.username || 
                          data.user.email?.split('@')[0] || 
                          data.user.id.substring(0, 8);
                          
        // Create enhanced user data with the calculated display name
        const enhancedUserData = {
          ...data.user,
          display_name: displayName
        };
        
        login(enhancedUserData);
      } else {
        setUserInfo(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUserInfo(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      setHasCheckedAuth(true);
    }
  }, [hasCheckedAuth, isLoading, login]);

  // Check auth status on mount only
  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuthStatus();
    }
  }, [checkAuthStatus, hasCheckedAuth]);

  // Memoize context value to prevent unnecessary re-renders
  // This follows React's official recommendation for context performance
  const contextValue = useMemo<AuthContextValue>(() => ({
    userInfo,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus
  }), [userInfo, isAuthenticated, isLoading, login, logout, checkAuthStatus]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  // The context will never be null due to our default values,
  // but we keep this check for development clarity
  if (context === defaultAuthContext) {
    console.warn('useAuth is being used outside of AuthProvider. Using default values.');
  }
  
  return context;
};

// Export the context for advanced use cases (testing, etc.)
export { AuthContext }; 