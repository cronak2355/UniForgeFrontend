import { Link } from 'react-router-dom';
import { memo } from 'react';

const Hero = () => {
    return (
        <section className="relative w-full min-h-screen flex flex-col items-center pt-32 pb-20 px-6 overflow-hidden bg-[#050505]">

            {/* Top Navigation / Logo Area */}
            <nav className="w-full flex justify-center mb-24 md:mb-32">
                <img
                    src="/logo-brand.png"
                    alt="Uniforge Logo"
                    className="h-10 md:h-12 w-auto opacity-90 transition-opacity hover:opacity-100"
                />
            </nav>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto text-center flex flex-col items-center z-10">

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tighter text-white mb-8 leading-[1.1]">
                    Easy 쉽고 <br className="hidden md:block" />
                    <span className="text-gray-400 block mt-2">Simple 단순하게</span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-2xl text-gray-500 mb-12 max-w-2xl font-light tracking-wide leading-relaxed">
                    상상하는 모든 것을 현실로 만드는 가장 빠른 방법.<br className="hidden md:block" />
                    UniForge와 함께 새로운 차원의 창작을 경험하세요.
                </p>

                {/* CTA Button */}
                <Link
                    to="/auth"
                    className="group relative inline-flex items-center gap-4 px-10 py-5 bg-blue-600 text-white rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_50px_rgba(37,99,235,0.5)]"
                >
                    <span>Start Creating</span>
                    <i className="fa-solid fa-arrow-right transition-transform group-hover:translate-x-1"></i>
                </Link>

            </div>

            {/* Subtle Footer Tagline */}
            <div className="absolute bottom-10 text-gray-700 text-sm tracking-[0.2em] uppercase font-medium">
                The Operating System for Creative Process
            </div>

        </section>
    );
};

export default memo(Hero);
