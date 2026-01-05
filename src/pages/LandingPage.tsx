import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Integration from '../components/landing/Integration';
import CallToAction from '../components/landing/CallToAction';
import Footer from '../components/common/Footer';
import { useScrollReveal } from '../hooks/useScrollReveal';

/**
 * 랜딩 페이지 컴포넌트
 * Hero, Features, Integration, CTA, Footer 섹션으로 구성
 */
const LandingPage = () => {
    // 스크롤 시 요소 reveal 애니메이션 적용
    useScrollReveal();

    return (
        <main className="landing-page">
            <Hero />
            <Features />
            <Integration />
            <CallToAction />
            <Footer />
        </main>
    );
};

export default LandingPage;
