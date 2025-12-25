import { memo } from 'react';

const Features = () => {
    return (
        <section id="features" className="features">
            <div className="container">
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
