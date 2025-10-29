// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

// Generate a unique tab ID that persists for this tab session
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
sessionStorage.setItem('TAB_ID', TAB_ID);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Use tab-specific storage key for authentication
  const authStorageKey = `auth_${TAB_ID}`;
  const [loading, setLoading] = useState(true);
  
  const [auth, setAuth] = useState(() => {
    // Only read tab-specific auth from sessionStorage
    const tabSpecificAuth = sessionStorage.getItem(authStorageKey) || sessionStorage.getItem('auth');
    if (tabSpecificAuth) return JSON.parse(tabSpecificAuth);
    return { token: null, user: null, roles: [] };
  });

  // 🚀 Normalize login payload with tab-specific storage
  const login = (data) => {
    const role = data.role || data.user?.role;

    // Cross-role lock: prevent logging in a different role in the same browser
    const activeRole = localStorage.getItem('activeRole');
    if (activeRole && activeRole !== role) {
      // Do not change state if another role is active
      return false;
    }
    const payload = {
      token: data.token,
      user: data.user,
      roles: data.roles || (role ? [role] : []), // always array
      tabId: TAB_ID, // Store tab ID with auth data
      timestamp: Date.now()
    };
    setAuth(payload);
    
    // Store auth only in sessionStorage (tab-specific)
    const authString = JSON.stringify(payload);
    sessionStorage.setItem(authStorageKey, authString);
    // Also store under a stable key for API helper access
    sessionStorage.setItem('auth', authString);

    // Write the active role globally to block other role logins in this browser
    localStorage.setItem('activeRole', role);
    
    // Set this as a fresh login
    sessionStorage.setItem('freshLogin', 'true');
    
    // Clear any previous session data
    sessionStorage.removeItem("lastViewedPage");
    
    // Disconnect any existing socket connections
    if (window.socket) {
      window.socket.disconnect();
    }

    return true;
  };

  const logout = () => {
    setAuth({ token: null, user: null, roles: [] });
    sessionStorage.removeItem(authStorageKey);
    sessionStorage.removeItem('freshLogin');
    sessionStorage.removeItem('auth');

    // Clear the global role lock so the other role can login
    localStorage.removeItem('activeRole');
    
    // Clear any session-specific data
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(`tab_`) || key.includes(TAB_ID)) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Disconnect socket on logout
    if (window.socket) {
      window.socket.disconnect();
    }
  };

  useEffect(() => {
    // Nothing to hydrate from localStorage; auth is tab-specific
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      auth, 
      login, 
      logout, 
      isAuthenticated: !!auth.token,
      loading,
      tabId: TAB_ID
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
