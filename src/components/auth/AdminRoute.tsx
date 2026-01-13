import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../common/Loading';

interface AdminRouteProps {
    children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <Loading />;
    }

    if (!user || user.role !== 'ADMIN') {
        return <Navigate to="/main" replace />;
    }

    return <>{children}</>;
}
