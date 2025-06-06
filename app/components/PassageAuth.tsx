"use client";

import React, { useEffect, useState, useRef } from 'react';
import '../styles/passage.css';
import { useAuth } from '../contexts/AuthContext';

const PassageAuth: React.FC = () => {
  const { isAuthenticated, isLoading, logout, checkAuthStatus } = useAuth();
  const [appId, setAppId] = useState<string>('');
  const [showPassageModal, setShowPassageModal] = useState(false);
  const scriptLoaded = useRef(false);

  // Load Passage configuration and script only once
  useEffect(() => {
    const loadPassageConfig = async () => {
      try {
        // Get the app ID from the API
        const res = await fetch('/api/auth/config');
        const data = await res.json();
        if (data.appId) {
          setAppId(data.appId);
          
          // Only load script once
          if (!scriptLoaded.current) {
            // Load Passage web elements
            if (!document.querySelector('script[src="https://cdn.passage.id/passage-web.js"]')) {
              const script = document.createElement('script');
              script.src = 'https://cdn.passage.id/passage-web.js';
              script.async = true;
              script.onload = () => {
                console.log("Passage script loaded");
                scriptLoaded.current = true;
              };
              document.body.appendChild(script);
            } else {
              // Script already exists, mark as loaded
              scriptLoaded.current = true;
            }
          }
        }
      } catch (error) {
        console.error("Error loading Passage config:", error);
      }
    };
    
    loadPassageConfig();
  }, []); // Only run once on mount

  // Listen for auth events
  useEffect(() => {
    const handleAuthEvent = () => {
      console.log("Auth complete event detected");
      setTimeout(() => {
        checkAuthStatus();
        setShowPassageModal(false);
      }, 500);
    };
    
    window.addEventListener('passage-auth-complete', handleAuthEvent);
    
    return () => {
      window.removeEventListener('passage-auth-complete', handleAuthEvent);
    };
  }, [checkAuthStatus]);

  // Logout handler
  const handleLogout = async () => {
    await logout();
  };

  // Handle login/modal
  const handleLoginClick = () => {
    setShowPassageModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowPassageModal(false);
  };

  if (isLoading) {
    return (
      <button 
        className="auth-text-button loading-button"
        disabled
        title="Loading..."
        aria-label="Loading"
      >
        <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"></path>
        </svg>
        Loading
      </button>
    );
  }

  return (
    <div className="passage-auth-container">
      {/* Text-based login/logout buttons */}
      {appId ? (
        isAuthenticated ? (
          <button 
            onClick={handleLogout}
            className="auth-text-button logout-button"
            title="Log out"
            aria-label="Log out"
          >
            Logout
          </button>
        ) : (
          <button 
            onClick={handleLoginClick}
            className="auth-text-button login-button"
            title="Log in"
            aria-label="Log in"
          >
            Login
          </button>
        )
      ) : (
        <button 
          className="auth-text-button loading-button"
          disabled
          title="Loading..."
          aria-label="Loading"
        >
          <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"></path>
          </svg>
          Loading
        </button>
      )}

      {/* Passage auth modal - directly using passage-auth element */}
      {showPassageModal && appId && (
        <div className="passage-modal-overlay" onClick={handleCloseModal}>
          <div className="passage-modal-content" onClick={e => e.stopPropagation()}>
            <button className="passage-modal-close" onClick={handleCloseModal}>×</button>
            <div className="passage-modal-body">
              <passage-auth 
                app-id={appId}
                auth-method="passkey"
                theme="auto"
                class="custom-passage-auth"
              ></passage-auth>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add type declaration for passage-auth-complete event
declare global {
  interface WindowEventMap {
    'passage-auth-complete': CustomEvent;
  }
}

// Add type declaration for passage-auth custom element
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'passage-auth': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'app-id': string;
        'auth-method'?: 'passkey' | 'magic_link' | 'otp';
        'theme'?: 'light' | 'dark' | 'auto';
        'class'?: string;
      };
    }
  }
}

export default PassageAuth; 