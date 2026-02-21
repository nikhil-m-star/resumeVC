import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import api from '../services/api';

const AuthContext = createContext();

const parseStoredUser = (value) => {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const getStoredSession = () => {
    const storedToken = localStorage.getItem('token');
    const parsedStoredUser = parseStoredUser(localStorage.getItem('user'));
    return { storedToken, parsedStoredUser };
};

const getInitialUserFromStorage = () => {
    const { storedToken, parsedStoredUser } = getStoredSession();
    if (!storedToken || !parsedStoredUser) return null;
    return parsedStoredUser;
};

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
    const { signOut } = useClerk();
    const { isLoaded: clerkAuthLoaded, getToken } = useClerkAuth();
    const [user, setUser] = useState(() => getInitialUserFromStorage());
    const [loading, setLoading] = useState(false);
    const [socialAuthError, setSocialAuthError] = useState('');
    const hasInitialized = useRef(Boolean(getInitialUserFromStorage()));

    const clearAuthStorage = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const isFallbackEmail = (value) => {
        if (!value || typeof value !== 'string') return true;
        if (!value.includes('@')) return true;
        if (value.endsWith('@clerk.local')) return true;
        if (value.startsWith('user_')) return true;
        return false;
    };

    useEffect(() => {
        if (!clerkLoaded || !clerkAuthLoaded) return;
        if (isSignedIn && !clerkUser) {
            setLoading(true);
            return;
        }

        let cancelled = false;

        const syncAuth = async () => {
            if (isSignedIn || !hasInitialized.current) {
                setLoading(true);
            }
            setSocialAuthError('');

            try {
                const { storedToken, parsedStoredUser } = getStoredSession();

                if (!isSignedIn) {
                    if (parsedStoredUser?.authProvider === 'local' && storedToken) {
                        if (!cancelled) setUser(parsedStoredUser);
                        return;
                    }

                    clearAuthStorage();
                    if (!cancelled) setUser(null);
                    return;
                }

                const clerkPrimaryEmail =
                    clerkUser?.primaryEmailAddress?.emailAddress ||
                    clerkUser?.emailAddresses?.[0]?.emailAddress ||
                    null;

                if (parsedStoredUser?.authProvider === 'clerk' && parsedStoredUser?.clerkId === clerkUser.id && storedToken) {
                    const hydratedStoredUser = {
                        ...parsedStoredUser,
                        email: isFallbackEmail(parsedStoredUser.email)
                            ? (clerkPrimaryEmail || parsedStoredUser.email || '')
                            : parsedStoredUser.email,
                        name: parsedStoredUser.name || clerkUser?.fullName || clerkUser?.firstName || 'User',
                    };

                    localStorage.setItem('user', JSON.stringify(hydratedStoredUser));

                    if (!isFallbackEmail(hydratedStoredUser.email)) {
                        if (!cancelled) setUser(hydratedStoredUser);
                        return;
                    }
                }

                let clerkToken = null;
                for (let attempt = 0; attempt < 2; attempt += 1) {
                    clerkToken = await getToken();
                    if (clerkToken) break;
                    await new Promise((resolve) => setTimeout(resolve, 150));
                }

                let response;
                let lastError;

                for (let i = 0; i < 2; i++) {
                    try {
                        response = await api.post(
                            '/auth/clerk-exchange',
                            {
                                clerkUserId: clerkUser?.id || null,
                                email:
                                    clerkUser?.primaryEmailAddress?.emailAddress ||
                                    clerkUser?.emailAddresses?.[0]?.emailAddress ||
                                    null,
                                name: clerkUser?.fullName || clerkUser?.firstName || null,
                            },
                            {
                                headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : undefined,
                                skipAuthRedirect: true,
                                timeout: 4000,
                            }
                        );
                        break;
                    } catch (err) {
                        lastError = err;
                        await new Promise((resolve) => setTimeout(resolve, 350 * (i + 1)));
                    }
                }

                if (!response) throw lastError;

                const exchangedUser = {
                    ...response.data.user,
                    email: clerkPrimaryEmail || response.data.user?.email || '',
                    name: response.data.user?.name || clerkUser?.fullName || clerkUser?.firstName || 'User',
                    authProvider: 'clerk',
                    clerkId: clerkUser.id,
                };

                // Clean up Clerk URL parameters
                const url = new URL(window.location.href);
                if (url.searchParams.has('__clerk_handshake') || url.searchParams.has('__clerk_db_jwt')) {
                    url.searchParams.delete('__clerk_handshake');
                    url.searchParams.delete('__clerk_db_jwt');
                    window.history.replaceState({}, '', url.toString());
                }

                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(exchangedUser));
                if (!cancelled) setUser(exchangedUser);
            } catch (error) {
                console.error('Failed to sync Clerk session', error);
                const { storedToken, parsedStoredUser } = getStoredSession();
                const hasCachedSession = Boolean(storedToken && parsedStoredUser);
                if (!hasCachedSession) {
                    clearAuthStorage();
                }
                if (!cancelled) {
                    if (!hasCachedSession) {
                        setUser(null);
                    }
                    const isNetworkError = !error?.response;
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                    const serverMessage =
                        (isNetworkError ? `Cannot connect to backend at ${apiUrl}. Start the server and try again.` : null) ||
                        error?.response?.data?.message ||
                        error?.message ||
                        'Google authentication failed. Please try again.';
                    setSocialAuthError(serverMessage);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    hasInitialized.current = true;
                }
            }
        };

        syncAuth();

        return () => {
            cancelled = true;
        };
    }, [clerkLoaded, clerkAuthLoaded, isSignedIn, clerkUser, getToken]);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        const normalizedUser = { ...user, authProvider: 'local' };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        setUser(normalizedUser);
        hasInitialized.current = true;
        setLoading(false);
        return normalizedUser;
    };

    const register = async (email, password, name) => {
        const response = await api.post('/auth/register', { email, password, name });
        const { token, user } = response.data;
        const normalizedUser = { ...user, authProvider: 'local' };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        setUser(normalizedUser);
        hasInitialized.current = true;
        setLoading(false);
        return normalizedUser;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error', error);
        }

        try {
            if (isSignedIn) {
                await signOut();
            }
        } catch (error) {
            console.error('Clerk logout error', error);
        } finally {
            clearAuthStorage();
            setSocialAuthError('');
            setUser(null);
            setLoading(false);
            hasInitialized.current = true;
        }
    };

    const value = {
        user,
        loading,
        socialAuthError,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
