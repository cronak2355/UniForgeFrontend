import { memo } from 'react';

const BentoFeatures = () => {
    return (
        <section className="w-full py-20 px-6 bg-[#050505] pb-40">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 h-auto md:h-[600px]">

                    {/* Bento Item 1 - Large Left */}
                    <div className="col-span-1 md:col-span-2 row-span-2 rounded-3xl bg-[#131517] border border-white/5 p-8 md:p-12 relative overflow-hidden group">
                        <div className="relative z-10">
                            <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-300 mb-6 inline-block">Asset Library</span>
                            <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">수천 가지 에셋,<br />다운로드 없이 바로.</h3>
                            <p className="text-gray-400 max-w-sm font-light leading-relaxed">
                                클라우드에서 제공되는 프리미엄 에셋을 즉시 사용하세요. 로컬 저장 공간 걱정 없이, 드래그 앤 드롭으로 충분합니다.
                            </p>
                        </div>
                        {/* Abstract Visual - Monochrome Speed Vibe */}
                        <div className="absolute right-[-20px] bottom-[-20px] w-64 h-64 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-[80px] group-hover:blur-[60px] transition-all duration-700"></div>
                        <div className="absolute right-10 bottom-10 w-40 h-40 bg-[#1A1D21] rounded-xl border border-white/5 rotate-[-6deg] group-hover:rotate-[-2deg] transition-transform duration-500 flex items-center justify-center">
                            <i className="fa-solid fa-cube text-4xl text-gray-600 group-hover:text-blue-500 transition-colors"></i>
                        </div>
                    </div>

                    {/* Bento Item 2 - Top Right */}
                    <div className="col-span-1 row-span-1 rounded-3xl bg-[#131517] border border-white/5 p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="relative z-10">
                            <i className="fa-brands fa-unity text-2xl text-white mb-4"></i>
                            <h3 className="text-xl font-bold text-white mb-2">Unity 연동</h3>
                            <p className="text-gray-500 text-sm">작업한 결과물을 클릭 한 번으로 Unity로.</p>
                        </div>
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                    </div>

                    {/* Bento Item 3 - Bottom Right */}
                    <div className="col-span-1 row-span-1 rounded-3xl bg-[#131517] border border-white/5 p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="relative z-10">
                            <i className="fa-solid fa-code-branch text-2xl text-blue-500 mb-4"></i>
                            <h3 className="text-xl font-bold text-white mb-2">버전 관리</h3>
                            <p className="text-gray-500 text-sm">자동 저장과 히스토리 기능으로 안전하게.</p>
                        </div>
                        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default memo(BentoFeatures);
