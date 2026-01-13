import Hero from '../components/landing/Hero';
import WhyUniforge from '../components/landing/WhyUniforge';
import BentoFeatures from '../components/landing/BentoFeatures';
import Footer from '../components/common/Footer';
import { useScrollReveal } from '../hooks/useScrollReveal';

/**
 * 랜딩 페이지 컴포넌트
 */
const LandingPage = () => {
    // 스크롤 시 요소 reveal 애니메이션 적용 (Optional)
    useScrollReveal();

    return (
        <main className="landing-page w-full min-h-screen bg-[#050505] text-white">
            <Hero />
            <WhyUniforge />
            <BentoFeatures />
            <Footer />
        </main>
    );
};

export default LandingPage;
