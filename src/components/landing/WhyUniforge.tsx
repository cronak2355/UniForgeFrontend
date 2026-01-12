import { memo } from 'react';

const WhyUniforge = () => {
    const features = [
        {
            icon: "fa-wand-magic-sparkles",
            title: "직관적인 에디터",
            desc: "복잡한 툴은 이제 그만. 직관적인 인터페이스로 아이디어를 즉시 구현하세요.",
            // Monochrome: White icon, Gray border
        },
        {
            icon: "fa-puzzle-piece",
            title: "손쉬운 연동",
            desc: "드래그 앤 드롭으로 끝. Unity 포맷 완벽 지원.",
        },
        {
            icon: "fa-robot",
            title: "AI 에셋 에디터",
            desc: "텍스트가 에셋이 되는 마법. AI와 함께 무한한 리소스를 창조하세요.",
        }
    ];

    return (
        <section className="w-full py-32 px-6 bg-[#050505] overflow-hidden relative">
            {/* Speed Lines Background Effect (Monochrome) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[1px] h-full bg-white"></div>
                <div className="absolute top-0 left-3/4 w-[1px] h-full bg-white delay-700"></div>
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white opacity-50"></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10 px-4">
                {/* Header - Skewed & Italic for Speed (Reduced Skew to fix clipping) */}
                <div className="mb-24 text-center transform -skew-x-3">
                    <span className="text-gray-500 font-mono text-sm tracking-[0.3em] uppercase mb-6 block italic">
                        Why Uniforge?
                    </span>
                    <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter italic mb-6 leading-[0.9]">
                        MORE FAST <br />
                        <span className="text-gray-600">
                            MORE EASY
                        </span>
                    </h2>
                </div>

                {/* Grid - Cards with Hip Borders (Monochrome) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <div key={idx} className="group relative bg-[#050505] p-10 hover:-translate-y-2 transition-transform duration-300 ease-out border border-white/5 hover:border-white/20">
                            {/* Hover Flush Effect */}
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300"></div>

                            {/* Icon */}
                            <div className="relative mb-8">
                                <i className={`fa-solid ${feature.icon} text-4xl text-white italic group-hover:scale-110 transition-transform duration-300 inline-block opacity-80 group-hover:opacity-100`}></i>
                            </div>

                            {/* Text */}
                            <h3 className="text-2xl font-bold text-white mb-4 italic tracking-tight uppercase group-hover:tracking-normal transition-all duration-300">
                                {feature.title}
                            </h3>
                            <p className="text-gray-400 text-sm font-medium leading-relaxed">
                                {feature.desc}
                            </p>

                            {/* Corner Accent (Monochrome) */}
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default memo(WhyUniforge);
