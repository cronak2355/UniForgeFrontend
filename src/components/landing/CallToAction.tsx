import { memo } from 'react';
import { Link } from 'react-router-dom';

const CallToAction = () => {
    return (
        <section className="w-full py-32 px-6 bg-[#050505]">
            <div className="max-w-4xl mx-auto text-center">
                {/* Heading */}
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                    지금 바로 시작하세요
                </h2>
                <p className="text-lg md:text-xl text-gray-500 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                    복잡한 설정 없이, 브라우저에서 바로 창작을 시작하세요.<br className="hidden md:block" />
                    UniForge가 당신의 상상을 현실로 만들어 드립니다.
                </p>

                {/* CTA Button */}
                <Link
                    to="/auth"
                    className="group inline-flex items-center gap-4 px-12 py-6 bg-white text-black rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-gray-100 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]"
                >
                    <span className="text-black">시작하기</span>
                    <i className="fa-solid fa-arrow-right text-black transition-transform group-hover:translate-x-1"></i>
                </Link>

                {/* Subtitle */}
                <p className="mt-8 text-sm text-gray-600">
                    지금 바로 시작하기
                </p>
            </div>
        </section>
    );
};

export default memo(CallToAction);
