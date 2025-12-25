import { memo } from 'react';

const Integration = () => {
    return (
        <section id="integration" className="integration">
            <div className="container integration-content">
                <div className="integration-image reveal">
                    <div className="platform-icon uniforge">
                        <i className="fa-solid fa-cube"></i>
                    </div>
                    <div className="arrow-anim">
                        <i className="fa-solid fa-angles-right"></i>
                    </div>
                    <div className="platform-icon unity">
                        <i className="fa-brands fa-unity"></i>
                    </div>
                </div>
                <div className="integration-text reveal delay-200">
                    <h2>Unity로 한계 돌파</h2>
                    <p>Uniforge에서 쉽고 빠르게 프로토타입을 만들고, Unity로 가져와서 본격적인 개발을 이어가세요. 완벽한 호환성을 자랑합니다.</p>
                    <br />
                    <ul className="check-list">
                        <li><i className="fa-solid fa-check"></i> 원클릭 내보내기 (.unitypackage)</li>
                        <li><i className="fa-solid fa-check"></i> 모든 에셋 및 스크립트 자동 변환</li>
                        <li><i className="fa-solid fa-check"></i> 초보자도 쉽게 이해하는 구조</li>
                    </ul>
                </div>
            </div>
        </section>
    );
};

export default memo(Integration);
