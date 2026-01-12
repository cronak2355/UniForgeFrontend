import { memo, ReactNode } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
    children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="ml-[72px] min-h-screen">
                {children}
            </div>
        </div>
    );
};

export default memo(AppLayout);
