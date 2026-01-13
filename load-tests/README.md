# 부하 테스트 실행 가이드

## 사전 요구사항
k6가 설치되어 있어야 합니다.

## 테스트 실행

### 1. 마켓플레이스 단일 유저 테스트
```bash
k6 run marketplace-single.js
```

### 2. 마켓플레이스 동시 접속 테스트 (50~200명)
```bash
k6 run marketplace-concurrent.js
```

### 3. 에셋 등록 동시 테스트 (인증 필요)
```bash
# Windows PowerShell
$env:AUTH_TOKEN="your_jwt_token_here"
k6 run asset-create.js
```

## 점수 기준

| 테스트 | 3점 | 2점 | 1점 |
|--------|-----|-----|-----|
| 에셋 조회 (1인) | < 0.5s | < 1s | < 2s |
| 동시 접속 (50~200명) | < 1s | < 2s | < 5s |
| 에셋 등록 (50~100명) | < 1s | < 5s | < 10s |

## 결과 확인
각 테스트 실행 후 HTML 리포트가 생성됩니다.
