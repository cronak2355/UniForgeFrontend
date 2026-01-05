import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import type { AuthMode, AuthFormData } from '../types';
import '../styles/auth.css';

const INITIAL_FORM_DATA: AuthFormData = {
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
};

const AuthPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, login, signup } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [formData, setFormData] = useState<AuthFormData>(INITIAL_FORM_DATA);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLoginMode = mode === 'login';

    // 모든 useCallback hooks를 조건부 return 전에 선언
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isLoginMode) {
                // AuthContext의 login 함수 사용 (상태 동기화)
                await login(formData.email, formData.password);
            } else {
                // 비밀번호 확인 체크
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('비밀번호가 일치하지 않습니다');
                }
                // AuthContext의 signup 함수 사용 (상태 동기화)
                await signup(formData.email, formData.password, formData.username);
            }
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : '오류가 발생했습니다');
        } finally {
            setIsLoading(false);
        }
    }, [isLoginMode, formData, navigate, login, signup]);

    const toggleMode = useCallback(() => {
        setMode(prev => prev === 'login' ? 'signup' : 'login');
        setFormData(INITIAL_FORM_DATA);
        setError(null);
    }, []);

    const handleGoogleLogin = useCallback(() => {
        window.location.href = authService.getGoogleLoginUrl();
    }, []);

    // 이미 로그인된 경우 홈으로 리다이렉트
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    // 조건부 return은 모든 hooks 선언 후에
    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <Link to="/" className="auth-logo">
                    <i className="fa-solid fa-cube" />
                    <span className="gradient-text">Uniforge</span>
                </Link>

                <header className="auth-header">
                    <h1>{isLoginMode ? '로그인' : '회원가입'}</h1>
                    <p>Uniforge로 계속</p>
                </header>

                {error && (
                    <div className="auth-error" style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '12px',
                        marginBottom: '16px',
                        fontSize: '0.9rem',
                    }}>
                        {error}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    {!isLoginMode && (
                        <div className="form-group">
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                placeholder="사용자 이름"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="이메일"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="비밀번호"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                            </button>
                        </div>
                    </div>

                    {!isLoginMode && (
                        <div className="form-group">
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="비밀번호 확인"
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`auth-submit-btn ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="btn-loader" />
                        ) : (
                            isLoginMode ? '계속' : '계정 생성'
                        )}
                    </button>
                </form>

                <div className="auth-switch">
                    <p>
                        {isLoginMode ? 'Uniforge를 처음 사용하시나요? ' : '이미 계정이 있으신가요? '}
                        <button type="button" onClick={toggleMode}>
                            {isLoginMode ? '계정 생성' : '로그인'}
                        </button>
                    </p>
                </div>

                <div className="auth-divider">
                    <span>또는</span>
                </div>

                <div className="social-login">
                    <button
                        type="button"
                        className="social-btn google"
                        onClick={handleGoogleLogin}
                    >
                        <i className="fab fa-google" />
                        Google로 계속
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
