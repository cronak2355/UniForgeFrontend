import { useEffect } from 'react';

/**
 * 스크롤 시 요소를 reveal 애니메이션으로 표시하는 커스텀 훅
 * @param selector - 관찰할 요소의 CSS 선택자 (기본값: '.reveal')
 * @param threshold - 요소가 보여야 하는 비율 (0-1, 기본값: 0.1)
 */
export const useScrollReveal = (
    selector: string = '.reveal',
    threshold: number = 0.1
): void => {
    useEffect(() => {
        window.scrollTo(0, 0);

        const observerOptions: IntersectionObserverInit = {
            threshold,
            rootMargin: '0px 0px -50px 0px',
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        // DOM이 완전히 준비된 후 요소 관찰 시작
        const timeoutId = setTimeout(() => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => observer.observe(el));
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [selector, threshold]);
};
