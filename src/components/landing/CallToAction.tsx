import { Link } from 'react-router-dom';
import { memo } from 'react';

const CallToAction = () => {
    return (
        <section className="cta reveal">
            <div className="container">
                <div className="cta-box">
                    <h2>지금 바로 <Link to="/auth" className="cta-text-link">시작</Link>하세요</h2>
                    <p>당신의 첫 번째 게임이 기다리고 있습니다. 아무런 준비도 필요 없습니다.</p>
                </div>
            </div>
        </section>
    );
};

export default memo(CallToAction);
