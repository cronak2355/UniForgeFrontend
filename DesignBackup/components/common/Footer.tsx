import { memo } from 'react';

const Footer = () => {
    return (
        <footer className="w-full py-8 border-t border-white/5 bg-[#050505]">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-gray-600 text-sm font-light">
                    &copy; 2025 Uniforge. All rights reserved.
                </p>
                <div className="flex gap-6">
                    <a href="#" className="text-gray-600 hover:text-white transition-colors text-sm">Privacy</a>
                    <a href="#" className="text-gray-600 hover:text-white transition-colors text-sm">Terms</a>
                    <a href="#" className="text-gray-600 hover:text-white transition-colors text-sm">Contact</a>
                </div>
            </div>
        </footer>
    );
};

export default memo(Footer);
