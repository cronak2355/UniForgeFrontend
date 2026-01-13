import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// =====================================================
// 테스트 3: 에셋 등록 동시 테스트 (50~100명)
// 점수 기준: 1초(3점), 5초(2점), 10초(1점)
// =====================================================

// ⚠️ 실행 전 TOKEN 값을 실제 JWT 토큰으로 교체하세요
const TOKEN = __ENV.AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';

export const options = {
    scenarios: {
        asset_upload: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 50 },   // 50명까지 증가
                { duration: '1m', target: 100 },   // 100명으로 증가
                { duration: '1m', target: 100 },   // 100명 유지
                { duration: '30s', target: 0 },    // 종료
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<10000'], // 10초 이내 = 최소 1점
        http_req_failed: ['rate<0.1'],
    },
};

const BASE_URL = 'https://uniforge.kr/api';

export default function () {
    const payload = JSON.stringify({
        name: `LoadTest Asset ${Date.now()}-${__VU}`,
        price: 0,
        description: 'k6 load test asset',
        isPublic: true,
        genre: '테스트',
    });

    const res = http.post(`${BASE_URL}/assets`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`,
        },
    });

    check(res, {
        'created (200/201)': (r) => r.status === 200 || r.status === 201,
        '⭐⭐⭐ < 1s (3점)': (r) => r.timings.duration < 1000,
        '⭐⭐ < 5s (2점)': (r) => r.timings.duration < 5000,
        '⭐ < 10s (1점)': (r) => r.timings.duration < 10000,
    });

    sleep(2);
}

export function handleSummary(data) {
    return {
        'asset-create-report.html': htmlReport(data),
    };
}
