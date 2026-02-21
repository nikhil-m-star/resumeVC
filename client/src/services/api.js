import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let tokenGetter = null;
let refreshInFlight = null;

export const setAuthTokenGetter = (getter) => {
    tokenGetter = getter;
};

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

const refreshClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

const isAuthEndpoint = (url = '') => {
    return (
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/clerk-exchange') ||
        url.includes('/auth/refresh-token')
    );
};

const isInvalidTokenResponse = (error) => {
    if (error.response?.status !== 400) return false;
    const message = error.response?.data?.message;
    return typeof message === 'string' && message.toLowerCase().includes('invalid token');
};

const getRefreshedToken = async () => {
    if (!refreshInFlight) {
        refreshInFlight = refreshClient
            .post('/auth/refresh-token', {}, { skipAuthRedirect: true })
            .then((response) => response.data?.accessToken || response.data?.token || null)
            .finally(() => {
                refreshInFlight = null;
            });
    }

    return refreshInFlight;
};

api.interceptors.request.use(
    async (config) => {
        const existingAuthHeader = config.headers?.Authorization || config.headers?.authorization;
        if (existingAuthHeader) {
            return config;
        }

        let token = null;

        if (tokenGetter) {
            token = await tokenGetter();
        }

        if (!token) {
            token = localStorage.getItem('token');
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config || {};
        const path = window.location.pathname;
        const isAuthPage = path === '/login' || path === '/register';
        const skipRedirect = Boolean(originalRequest?.skipAuthRedirect);
        const hasToken = Boolean(localStorage.getItem('token'));
        const isAuthRequest = isAuthEndpoint(originalRequest?.url || '');
        const shouldTryRefresh =
            !originalRequest._retry &&
            !isAuthRequest &&
            hasToken &&
            (error.response?.status === 401 || isInvalidTokenResponse(error));

        if (shouldTryRefresh) {
            originalRequest._retry = true;

            try {
                const newToken = await getRefreshedToken();
                if (newToken) {
                    localStorage.setItem('token', newToken);
                    originalRequest.headers = {
                        ...(originalRequest.headers || {}),
                        Authorization: `Bearer ${newToken}`,
                    };
                    return api(originalRequest);
                }
            } catch {
                // Fall through to redirect handling below.
            }
        }

        const isAuthError = error.response?.status === 401 || isInvalidTokenResponse(error);

        if (isAuthError && !isAuthPage && !skipRedirect) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
