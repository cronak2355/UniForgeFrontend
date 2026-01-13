import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// =====================================================
// 테스트 1: 마켓플레이스 에셋 조회 (1인, 에셋 100~10000개)
// 점수 기준: 0.5초(3점), 1초(2점), 2초(1점)
// =====================================================

export const options = {
    scenarios: {
        single_user_load: {
            executor: 'constant-vus',
            vus: 1,
            duration: '30s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 2초 이내 = 최소 1점
    },
};

const BASE_URL = 'https://uniforge.kr/api';

export default function () {
    // 에셋 목록 조회
    const res = http.get(`${BASE_URL}/assets?sort=latest`);

    check(res, {
        'status is 200': (r) => r.status === 200,
        '⭐⭐⭐ < 500ms (3점)': (r) => r.timings.duration < 500,
        '⭐⭐ < 1000ms (2점)': (r) => r.timings.duration < 1000,
        '⭐ < 2000ms (1점)': (r) => r.timings.duration < 2000,
    });

    sleep(1);
}

export function handleSummary(data) {
    return {
        'marketplace-single-report.html': htmlReport(data),
    };
}
