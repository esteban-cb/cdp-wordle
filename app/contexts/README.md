# React Context Architecture

This directory contains the React Context implementation for the CDP Wordle application, following official React best practices as outlined in the [React createContext documentation](https://react.dev/reference/react/createContext).

## Overview

Our application uses three main contexts to manage global state:

- **`AuthContext`** - User authentication and identity management
- **`WalletContext`** - CDP wallet operations and balance tracking  
- **`GameContext`** - Wordle game state and message processing

## Architecture Principles

### 1. Performance Optimized
All contexts use `useMemo` to memoize the context value objects, preventing unnecessary re-renders of consuming components as recommended by React docs.

### 2. Meaningful Default Values
Each context provides meaningful default values rather than `null`, making the API more predictable and reducing runtime errors.

### 3. Developer-Friendly Error Messages
When hooks are used outside their providers, they provide clear error messages indicating the correct usage.

### 4. TypeScript Support
Full TypeScript support with proper type definitions for all context values and functions.

## Usage

### Basic Setup

The `AppProviders` component wraps all contexts and should be used at the root level:

```tsx
import { AppProviders } from './contexts/AppProviders';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
```

### Using Context Hooks

Each context provides a custom hook for easy consumption:

```tsx
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useGame } from '../contexts/GameContext';

function MyComponent() {
  const { userInfo, isAuthenticated, login, logout } = useAuth();
  const { walletInfo, initializeWallet, refreshBalances } = useWallet();
  const { guesses, addGuess, startNewGame } = useGame();
  
  // Your component logic...
}
```

## Context Details

### AuthContext

**Purpose**: Manages user authentication state and operations.

**Key Values**:
- `userInfo` - Current user information (id, displayName, email)
- `isAuthenticated` - Boolean authentication status
- `isLoading` - Loading state for auth operations
- `login(userData)` - Function to authenticate a user
- `logout()` - Function to log out the current user
- `checkAuthStatus()` - Function to verify current auth status

**Usage Example**:
```tsx
const { isAuthenticated, userInfo, logout } = useAuth();

if (!isAuthenticated) {
  return <LoginButton />;
}

return (
  <div>
    Welcome, {userInfo?.displayName}!
    <button onClick={logout}>Logout</button>
  </div>
);
```

### WalletContext

**Purpose**: Manages CDP wallet initialization, balance tracking, and operations.

**Key Values**:
- `walletInfo` - Wallet details (address, balance, usdcBalance, isConnected)
- `isInitializing` - Loading state for wallet initialization
- `isRefreshing` - Loading state for balance refresh operations
- `initializeWallet(username)` - Function to create/connect wallet
- `refreshBalances()` - Function to update wallet balances
- `clearWallet()` - Function to clear wallet state

**Usage Example**:
```tsx
const { walletInfo, isInitializing, refreshBalances } = useWallet();

return (
  <div>
    {isInitializing ? (
      <p>Initializing wallet...</p>
    ) : (
      <div>
        <p>Balance: {walletInfo.usdcBalance} USDC</p>
        <button onClick={refreshBalances}>Refresh</button>
      </div>
    )}
  </div>
);
```

### GameContext

**Purpose**: Manages Wordle game state, guesses, and message processing.

**Key Values**:
- `guesses` - Array of game guesses with results
- `keyStatus` - Keyboard color status mapping
- `isGameOver` - Boolean game completion status
- `addGuess(word, result)` - Function to add a new guess
- `updateKeyboardStatus(guess, result)` - Function to update keyboard colors
- `startNewGame()` - Function to reset game state
- `clearGameState()` - Function to clear all game data

**Usage Example**:
```tsx
const { guesses, isGameOver, startNewGame } = useGame();

return (
  <div>
    <div>Guesses: {guesses.length}/6</div>
    {isGameOver && (
      <button onClick={startNewGame}>Play Again</button>
    )}
  </div>
);
```

## Best Practices

### 1. Always Use Custom Hooks
Instead of importing the context directly, use the provided custom hooks:

```tsx
// ✅ Good
const { userInfo } = useAuth();

// ❌ Avoid
const context = useContext(AuthContext);
```

### 2. Handle Loading States
Always check loading states before performing operations:

```tsx
const { isLoading, isAuthenticated } = useAuth();
const { isInitializing, walletInfo } = useWallet();

if (isLoading || isInitializing) {
  return <LoadingSpinner />;
}

// Safe to use userInfo and walletInfo here
```

### 3. Error Boundaries
Consider wrapping components that use context with error boundaries for better error handling.

### 4. Testing
For testing, you can provide mock context values:

```tsx
import { AuthContext } from '../contexts/AuthContext';

const mockAuthValue = {
  userInfo: { id: '1', displayName: 'Test User', email: 'test@example.com' },
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  checkAuthStatus: jest.fn(),
};

render(
  <AuthContext.Provider value={mockAuthValue}>
    <ComponentUnderTest />
  </AuthContext.Provider>
);
```

## Performance Considerations

- All context values are memoized using `useMemo`
- Functions are memoized using `useCallback`
- Context providers only re-render consumers when actual values change
- Loading states prevent unnecessary operations and API calls

## Migration Guide

If you need to add new values to a context:

1. Update the context value type interface
2. Add the new value to the default context object
3. Implement the new functionality in the provider
4. Add the new value to the memoized context value
5. Update the dependency array if needed

## Troubleshooting

**Warning: "useAuth is being used outside of AuthProvider"**
- Ensure your component is wrapped within `AppProviders`
- Check that the provider is higher in the component tree

**Excessive re-renders**
- Verify that context values are properly memoized
- Check that dependency arrays in `useMemo` and `useCallback` are correct

**TypeScript errors**
- Ensure you're using the custom hooks instead of `useContext` directly
- Check that all required properties are included in context interfaces 