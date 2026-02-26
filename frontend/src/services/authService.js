// Enhanced Authentication Service with Token Refresh
class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.refreshPromise = null; // Prevent multiple refresh requests
    this.refreshTimeout = null;
  }

  // Store tokens in localStorage
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    
    // Set up automatic refresh 5 minutes before expiry
    this.scheduleTokenRefresh();
  }

  // Get access token
  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  // Get refresh token
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  // Clear all tokens
  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  // Schedule automatic token refresh
  scheduleTokenRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    // Refresh 5 minutes before token expires
    const refreshTime = 25 * 60 * 1000; // 25 minutes
    this.refreshTimeout = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }

  // Refresh access token
  async refreshToken() {
    // Prevent multiple refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performTokenRefresh(refreshToken);
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  // Perform actual token refresh
  async performTokenRefresh(refreshToken) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.data.access_token, data.data.refresh_token);
        return data.data;
      } else {
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      // If refresh fails, clear tokens and redirect to login
      this.clearTokens();
      window.location.href = '/login';
      throw error;
    }
  }

  // Login with automatic token storage
  async login(email, password) {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${this.baseURL}/api/token`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      if (data.two_factor_required) {
        return { two_factor_required: true };
      }

      // Store tokens
      this.setTokens(data.access_token, data.refresh_token);
      
      return {
        success: true,
        user: await this.getCurrentUser()
      };
    } catch (error) {
      throw error;
    }
  }

  // Verify 2FA
  async verify2FA(email, otp) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.message || '2FA verification failed');
      }

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.data.access_token, data.data.refresh_token);
        return {
          success: true,
          user: await this.getCurrentUser()
        };
      } else {
        throw new Error(data.message || '2FA verification failed');
      }
    } catch (error) {
      throw error;
    }
  }

  // Get current user info
  async getCurrentUser() {
    try {
      const response = await this.makeAuthenticatedRequest(`${this.baseURL}/api/auth/me`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Logout with token revocation
  async logout() {
    try {
      const accessToken = this.getAccessToken();
      const refreshToken = this.getRefreshToken();

      if (accessToken || refreshToken) {
        await fetch(`${this.baseURL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken
          })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  // Make authenticated request with automatic token refresh
  async makeAuthenticatedRequest(url, options = {}) {
    const makeRequest = async (token) => {
      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };

      return fetch(url, {
        ...options,
        headers
      });
    };

    let response = await makeRequest(this.getAccessToken());

    // If 401, try to refresh token and retry
    if (response.status === 401) {
      try {
        await this.refreshToken();
        response = await makeRequest(this.getAccessToken());
      } catch (refreshError) {
        // Refresh failed, tokens already cleared
        throw refreshError;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail?.message || errorData.message || 'Request failed');
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getAccessToken();
  }

  // Initialize auth service on app load
  initialize() {
    if (this.isAuthenticated()) {
      this.scheduleTokenRefresh();
    }
  }
}

// Create singleton instance
const authService = new AuthService();

// Export for use in components
export default authService;

// Export for React Context
export { AuthService };
