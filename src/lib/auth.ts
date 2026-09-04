import axios from 'axios';
import { getAPIBaseURL } from './config';

/**
 * The backend issues an app-signed JWT (see controllers/auth.controller.ts ->
 * issueAppToken) rather than a session cookie. It arrives as a `token` query
 * param on the /auth/callback redirect (see pages/AuthCallback.tsx) and from
 * then on every request must carry it as `Authorization: Bearer <token>`.
 */
const TOKEN_KEY = 'unijos-lms-auth-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

class RPApi {
  private client = axios.create({ withCredentials: false });

  private getBaseURL() {
    return getAPIBaseURL();
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get(`${this.getBaseURL()}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${getToken() ?? ''}` },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearToken();
        return null;
      }
      throw new Error(
        (axios.isAxiosError(error) && (error.response?.data as { detail?: string })?.detail) ||
          'Failed to get user info',
      );
    }
  }

  /** Kicks off the OIDC flow. The backend redirects to the identity provider,
   *  then back to /auth/callback on this frontend with a `token` param. */
  login(): void {
    window.location.href = `${this.getBaseURL()}/api/v1/auth/login`;
  }

  /** Username/password sign-in for the admin/librarian — bypasses OIDC.
   *  Throws with a user-facing message on invalid credentials. */
  async adminLogin(username: string, password: string): Promise<void> {
    try {
      const response = await this.client.post(`${this.getBaseURL()}/api/v1/auth/admin-login`, {
        username,
        password,
      });
      setToken(response.data.token);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Incorrect username or password');
      }
      throw new Error('Unable to sign in right now. Please try again shortly.');
    }
  }

  async logout(): Promise<void> {
    try {
      const response = await this.client.get(`${this.getBaseURL()}/api/v1/auth/logout`);
      clearToken();
      window.location.href = response.data.redirect_url;
    } catch {
      clearToken();
      window.location.href = '/';
    }
  }
}

export const authApi = new RPApi();
