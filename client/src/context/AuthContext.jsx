import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
    const { signOut } = useClerk();
    const { isLoaded: clerkAuthLoaded, getToken } = useClerkAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socialAuthError, setSocialAuthError] = useState('');
    const hasInitialized = useRef(false);

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
        if (isSignedIn && !clerkUser) return;

        let cancelled = false;

        const syncAuth = async () => {
            if (!hasInitialized.current) {
                setLoading(true);
            }
            setSocialAuthError('');

            try {
                const storedUser = localStorage.getItem('user');
                const storedToken = localStorage.getItem('token');
                const parsedStoredUser = storedUser ? JSON.parse(storedUser) : null;

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
                for (let attempt = 0; attempt < 3; attempt += 1) {
                    clerkToken = await getToken();
                    if (clerkToken) break;
                    await new Promise((resolve) => setTimeout(resolve, 250));
                }

                let response;
                let lastError;

                for (let i = 0; i < 3; i++) {
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
                            }
                        );
                        break; // Success
                    } catch (err) {
                        lastError = err;
                        console.log(`Clerk exchange attempt ${i + 1} failed, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 1s, 2s, 3s backoff
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
                clearAuthStorage();
                if (!cancelled) {
                    setUser(null);
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
    }, [clerkLoaded, clerkAuthLoaded, isSignedIn, clerkUser?.id, getToken]);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        const normalizedUser = { ...user, authProvider: 'local' };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        setUser(normalizedUser);
        return normalizedUser;
    };

    const register = async (email, password, name) => {
        const response = await api.post('/auth/register', { email, password, name });
        const { token, user } = response.data;
        const normalizedUser = { ...user, authProvider: 'local' };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        setUser(normalizedUser);
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
