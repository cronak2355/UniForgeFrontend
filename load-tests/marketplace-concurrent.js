import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// =====================================================
// 테스트 2: 마켓플레이스 동시 접속 (50~200명, 에셋 100~500개)
// 점수 기준: 1초(3점), 2초(2점), 5초(1점)
// =====================================================

export const options = {
    stages: [
        { duration: '30s', target: 50 },   // 50명까지 증가
        { duration: '1m', target: 100 },   // 100명으로 증가
        { duration: '30s', target: 200 },  // 200명까지 증가
        { duration: '1m', target: 200 },   // 200명 유지
        { duration: '30s', target: 0 },    // 종료
    ],
    thresholds: {
        http_req_duration: ['p(95)<5000'], // 5초 이내 = 최소 1점
        http_req_failed: ['rate<0.1'],     // 실패율 10% 미만
    },
};

const BASE_URL = 'https://uniforge.kr/api';

export default function () {
    const res = http.get(`${BASE_URL}/assets?sort=latest`);

    check(res, {
        'status is 200': (r) => r.status === 200,
        '⭐⭐⭐ < 1s (3점)': (r) => r.timings.duration < 1000,
        '⭐⭐ < 2s (2점)': (r) => r.timings.duration < 2000,
        '⭐ < 5s (1점)': (r) => r.timings.duration < 5000,
    });

    // 랜덤 딜레이 (실제 사용자 패턴 시뮬레이션)
    sleep(Math.random() * 3 + 1);
}

export function handleSummary(data) {
    return {
        'marketplace-concurrent-report.html': htmlReport(data),
    };
}
