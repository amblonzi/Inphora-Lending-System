import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { api } from '../services/api';
import { logger } from '../utils/logger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use the centralized API service
  // Note: Interceptors are already set up in the service

  useEffect(() => {
    const fetchUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const userData = await api.auth.getProfile();
                setUser(userData);
            } catch (error) {
                console.error("Failed to fetch user profile", error);
                // If fetching profile fails (e.g. invalid token), logout
                logout();
            }
        }
        setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const { access_token } = await api.auth.login(email, password);
      
      localStorage.setItem('token', access_token);
      
      // Fetch user profile immediately after login
      const userData = await api.auth.getProfile();
      setUser(userData);
      
      return true;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, api }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
