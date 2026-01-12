import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        // Simulate Google Login for now
        setTimeout(() => {
            login({
                id: '1',
                email: 'user@example.com',
                name: 'Demo User',
                profileImage: null
            });
            setIsLoading(false);
            navigate('/assets'); // Redirect to assets page after login
        }, 1500);
    };

    const handleGuestLogin = () => {
        setIsLoading(true);
        setTimeout(() => {
            login({
                id: 'guest',
                email: 'guest@uniforge.io',
                name: 'Guest User',
                profileImage: null
            });
            setIsLoading(false);
            navigate('/assets');
        }, 1000);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-md p-8 z-10">
                {/* Logo & Header */}
                <div className="text-center mb-12">
                    <img
                        src="/logo-brand.png"
                        alt="Uniforge"
                        className="h-10 mx-auto mb-8 opacity-90"
                    />
                    <h1 className="text-3xl font-bold text-white mb-3">Welcome Back</h1>
                    <p className="text-gray-500 font-light">
                        UniForge와 함께 창작을 시작하세요.
                    </p>
                </div>

                {/* Login Options */}
                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                        ) : (
                            <i className="fa-brands fa-google text-xl"></i>
                        )}
                        <span>Continue with Google</span>
                    </button>

                    <button
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-[#131517] text-gray-300 border border-white/10 py-4 rounded-xl font-medium text-lg hover:bg-[#1A1D21] hover:text-white hover:border-white/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <span>Guest Access</span>
                    </button>
                </div>

                {/* Footer Terms */}
                <p className="mt-10 text-center text-xs text-gray-600 leading-relaxed">
                    By continuing, you agree to UniForge's <br />
                    <a href="#" className="underline hover:text-gray-400">Terms of Service</a> and <a href="#" className="underline hover:text-gray-400">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
