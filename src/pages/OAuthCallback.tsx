import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * OAuth 콜백 처리 페이지
 * Google 로그인 후 JWT 토큰을 받아 처리
 */
const OAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { handleOAuthCallback } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            handleOAuthCallback(token)
                .then(() => navigate('/'))
                .catch(() => navigate('/auth'));
        } else {
            navigate('/auth');
        }
    }, [searchParams, handleOAuthCallback, navigate]);

    return (
        <div className="auth-page">
            <div className="auth-container" style={{ textAlign: 'center' }}>
                <span className="btn-loader" style={{ width: 40, height: 40 }} />
                <p style={{ marginTop: 20, color: '#888' }}>로그인 처리 중...</p>
            </div>
        </div>
    );
};

export default OAuthCallback;
