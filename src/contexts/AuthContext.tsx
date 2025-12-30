/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { authService, type User } from '../services/authService';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    handleOAuthCallback: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (import.meta.env.DEV) { // 지우셈 임시계정임                                                                                                                                                                                                                                     
            setUser({
                id: 'dev-user',
                email: 'dev@uniforge.com',
                name: 'Dev Tester',
                profileImage: null,
            } as unknown as User);

            setIsLoading(false);
            return;
        }
        // 앱 시작 시 현재 사용자 정보 로드
        const loadUser = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
            } catch {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await authService.login({ email, password });
        setUser(response.user);
    }, []);

    const signup = useCallback(async (email: string, password: string, name: string) => {
        const response = await authService.signup({ email, password, name });
        setUser(response.user);
    }, []);

    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
    }, []);

    const handleOAuthCallback = useCallback(async (token: string) => {
        authService.handleOAuthCallback(token);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
    }, []);

    const contextValue = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        signup,
        logout,
        handleOAuthCallback,
    }), [user, isLoading, login, signup, logout, handleOAuthCallback]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
