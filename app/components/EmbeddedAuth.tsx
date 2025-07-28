'use client';

import React, { useState } from 'react';
import { useEmbeddedAuth } from '../contexts/EmbeddedAuthContext';

const EmbeddedAuth: React.FC = () => {
  const {
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
  } = useEmbeddedAuth();

  // Local component state
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [signInStep, setSignInStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState<string | null>(null);

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter a valid email address');
      return;
    }

    const result = await startSignIn(email.trim());
    if (result.success) {
      setSignInStep('otp');
      console.log('OTP sent to:', email);
    } else {
      setError(result.error || 'Failed to send OTP');
    }
  };

  // Handle OTP submission
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    const result = await verifyOTP(otp.trim());
    if (result.success) {
      // Close modal and reset state
      closeModal();
    } else {
      setError(result.error || 'Invalid OTP. Please try again.');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  // Open sign-in modal
  const openSignInModal = () => {
    setShowSignInModal(true);
    setSignInStep('email');
    setEmail('');
    setOtp('');
    setError(null);
  };

  // Close modal and reset state
  const closeModal = () => {
    setShowSignInModal(false);
    setSignInStep('email');
    setEmail('');
    setOtp('');
    setError(null);
    clearSignInFlow();
  };

  // Handle back button in OTP step
  const handleBackToEmail = () => {
    setSignInStep('email');
    setOtp('');
    setError(null);
    clearSignInFlow();
  };

  // Loading state
  if (!isInitialized || isLoading) {
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
    <div className="embedded-auth-container">
      {/* Login/Logout button */}
      {isAuthenticated ? (
        <button 
          onClick={handleLogout}
          className="auth-text-button logout-button"
          title="Log out"
          aria-label="Log out"
          disabled={isLoading}
        >
          {isLoading ? 'Logging out...' : 'Logout'}
        </button>
      ) : (
        <button 
          onClick={openSignInModal}
          className="auth-text-button login-button"
          title="Log in"
          aria-label="Log in"
        >
          Login
        </button>
      )}

      {/* Sign-in modal */}
      {showSignInModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            
            <div className="modal-body">
              <h2 className="modal-title">
                {signInStep === 'email' ? 'Sign In' : 'Enter Verification Code'}
              </h2>

              {/* Email step */}
              {signInStep === 'email' && (
                <form onSubmit={handleEmailSubmit} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      placeholder="Enter your email"
                      required
                      disabled={isSigningIn}
                    />
                  </div>

                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="form-button primary"
                    disabled={isSigningIn || !email.trim()}
                  >
                    {isSigningIn ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </form>
              )}

              {/* OTP step */}
              {signInStep === 'otp' && (
                <form onSubmit={handleOTPSubmit} className="auth-form">
                  <p className="form-description">
                    We've sent a 6-digit verification code to <strong>{email}</strong>
                  </p>

                  <div className="form-group">
                    <label htmlFor="otp" className="form-label">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="form-input otp-input"
                      placeholder="000000"
                      maxLength={6}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}

                  <div className="form-buttons">
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      className="form-button secondary"
                      disabled={isLoading}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="form-button primary"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Display user info when authenticated */}
      {isAuthenticated && user && (
        <div className="user-info">
          <span className="user-id">User: {user.userId}</span>
        </div>
      )}
    </div>
  );
};

export default EmbeddedAuth; 