import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

let tokenGetter = null;

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
    (error) => {
        const path = window.location.pathname;
        const isAuthPage = path === '/login' || path === '/register';
        const skipRedirect = Boolean(error.config?.skipAuthRedirect);

        if (error.response?.status === 401 && !isAuthPage && !skipRedirect) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
