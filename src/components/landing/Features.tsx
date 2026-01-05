import { memo, useRef } from 'react';

const Features = () => {
    const sectionRef = useRef<HTMLElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        if (!sectionRef.current) return;

        const rect = sectionRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        sectionRef.current.style.setProperty('--mouse-x', `${x}px`);
        sectionRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <section
            id="features"
            className="features"
            ref={sectionRef}
            onMouseMove={handleMouseMove}
        >
            <div className="ribbon-container">
                <svg className="ribbon-svg" viewBox="0 0 1440 380" preserveAspectRatio="none">
                    {/* 불규칙한 손그림 느낌의 경로 1 */}
                    <path
                        className="ribbon-path"
                        d="M-50,150 C200,50 450,250 700,100 C950,-50 1200,200 1500,50"
                        fill="none"
                        strokeWidth="3"
                    />
                    {/* 엇갈리는 경로 2 (더 얇게) */}
                    <path
                        className="ribbon-path-2"
                        d="M-50,200 C300,350 600,0 900,200 C1100,350 1350,50 1500,250"
                        fill="none"
                        strokeWidth="2"
                    />
                    {/* 오른쪽 위 → 왼쪽 아래 대각선 곡선 */}
                    <path
                        className="ribbon-path-diagonal"
                        d="M1500,-20 C1200,80 900,180 600,220 C300,260 100,300 -50,380"
                        fill="none"
                        strokeWidth="1.5"
                    />
                    <path
                        className="ribbon-path-diagonal-2"
                        d="M1520,40 C1150,120 850,200 500,270 C200,330 50,350 -50,400"
                        fill="none"
                        strokeWidth="1"
                    />
                </svg>
            </div>

            <div className="container" style={{ position: 'relative', zIndex: 2 }}>
                <div className="section-header reveal">
                    <h2>왜 <span className="gradient-text">Uniforge</span>인가요?</h2>
                    <p>게임 개발이 처음인 당신을 위한 완벽한 도구입니다.</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card reveal delay-100">
                        <div className="icon-box">
                            <i className="fa-solid fa-shapes"></i>
                        </div>
                        <h3>풍부한 에셋 라이브러리</h3>
                        <p>수천 개의 캐릭터, 아이템, 배경 에셋을 무료로 사용하세요. 클릭만 하면 내 게임 속에 들어옵니다.</p>
                    </div>
                    <div className="feature-card reveal delay-200">
                        <div className="icon-box">
                            <i className="fa-solid fa-bolt"></i>
                        </div>
                        <h3>직관적인 에디터</h3>
                        <p>파워포인트보다 쉽습니다. 마우스 드래그로 맵을 꾸미고 이벤트를 설정해보세요.</p>
                    </div>
                    <div className="feature-card reveal delay-300">
                        <div className="icon-box">
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <h3>AI 어시스턴트</h3>
                        <p>"보스 몬스터 만들어줘"라고 말만 하세요. AI가 당신의 기획을 현실로 만들어줍니다.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default memo(Features);
