import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

export interface User {
    _id: string;
    username: string;
    employee_id: string;
    roles: string[];
    is_active: boolean;
    created_at: string;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    refreshAccessToken: () => Promise<void>;
    refreshUser: () => Promise<void>;
    error: string | null;
}

export interface RegisterData {
    username: string;
    password: string;
    employee_id: string;
    roles: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadUser = async () => {
        const response = await api.apiGet('/auth/me');
        return response?.data || null;
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                const currentUser = await loadUser();
                if (currentUser) {
                    setUser(currentUser);
                } else {
                    setUser(null);
                }
            } catch {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (username: string, password: string) => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await api.apiPost('/auth/login', { username, password });
            const data = response?.data;

            if (data?.user) {
                setUser(data.user);
            }
        } catch (err: any) {
            const errorMsg = err?.message || err?.response?.message || 'Login failed';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (payload: RegisterData) => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await api.apiPost('/auth/register', payload);
            const data = response?.data;

            if (data?.user) {
                setUser(data.user);
            }
        } catch (err: any) {
            const errorMsg = err?.message || err?.response?.message || 'Registration failed';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const refreshAccessToken = async () => {
        try {
            const response = await api.apiPost('/auth/refresh', {});
            const data = response?.data;

            if (data?.user) {
                setUser(data.user);
            }
        } catch {
            setUser(null);
        }
    };

    const refreshUser = async () => {
        try {
            const currentUser = await loadUser();
            if (currentUser) {
                setUser(currentUser);
            }
        } catch {
            // Keep existing auth state if the profile refresh fails.
        }
    };

    const logout = async () => {
        try {
            await api.apiPost('/auth/logout', {});
        } catch {
            // Ignore logout errors, we'll clear locally anyway.
        }

        setUser(null);
        setError(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                refreshAccessToken,
                refreshUser,
                error,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
