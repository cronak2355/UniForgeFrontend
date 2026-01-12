import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import type { AuthMode, AuthFormData } from '../types';

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
                await login(formData.email, formData.password);
            } else {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('비밀번호가 일치하지 않습니다');
                }
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

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden text-white">
            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-md p-8 z-10">
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <img
                        src="/logo-brand.png"
                        alt="Uniforge"
                        className="h-10 mx-auto mb-8 opacity-90"
                    />
                    <h1 className="text-3xl font-bold text-white mb-3">
                        {isLoginMode ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-gray-500 font-light">
                        UniForge와 함께 창작을 시작하세요.
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLoginMode && (
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            placeholder="사용자 이름"
                            required
                            className="w-full bg-[#131517] border border-white/10 text-white placeholder-gray-600 rounded-xl p-4 outline-none focus:border-blue-500 transition-all font-medium"
                        />
                    )}

                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="이메일"
                        required
                        className="w-full bg-[#131517] border border-white/10 text-white placeholder-gray-600 rounded-xl p-4 outline-none focus:border-blue-500 transition-all font-medium"
                    />

                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="비밀번호"
                            required
                            minLength={6}
                            className="w-full bg-[#131517] border border-white/10 text-white placeholder-gray-600 rounded-xl p-4 outline-none focus:border-blue-500 transition-all font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                    </div>

                    {!isLoginMode && (
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="비밀번호 확인"
                            required
                            minLength={6}
                            className="w-full bg-[#131517] border border-white/10 text-white placeholder-gray-600 rounded-xl p-4 outline-none focus:border-blue-500 transition-all font-medium"
                        />
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                        {isLoading ? (
                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                        ) : (
                            <span>{isLoginMode ? 'Continue' : 'Create Account'}</span>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-8 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <span className="relative bg-[#050505] px-4 text-xs text-gray-500 uppercase font-medium">
                        Or continue with
                    </span>
                </div>

                {/* Social Login */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-[#131517] text-gray-300 border border-white/10 py-4 rounded-xl font-medium text-lg hover:bg-[#1A1D21] hover:text-white hover:border-white/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <i className="fa-brands fa-google text-xl"></i>
                    <span>Google</span>
                </button>

                {/* Footer Switch */}
                <p className="mt-10 text-center text-sm text-gray-600">
                    {isLoginMode ? "Uniforge를 처음 사용하시나요? " : "이미 계정이 있으신가요? "}
                    <button
                        onClick={toggleMode}
                        className="text-white hover:underline underline-offset-4 font-medium ml-1"
                    >
                        {isLoginMode ? "계정 생성" : "로그인"}
                    </button>
                </p>

                {/* Terms */}
                <div className="mt-8 text-center text-xs text-gray-700 leading-relaxed">
                    By continuing, you agree to UniForge's <br />
                    <a href="#" className="underline hover:text-gray-500">Terms of Service</a> and <a href="#" className="underline hover:text-gray-500">Privacy Policy</a>.
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
