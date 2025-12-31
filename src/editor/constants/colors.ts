/**
 * 에디터 전역 색상 상수
 * Entry Style Color Palette
 */
export const colors = {
    bgPrimary: '#0d1117',      // 메인 배경 (깊은 검정)
    bgSecondary: '#161b22',    // 패널 배경
    bgTertiary: '#21262d',     // 호버/입력 배경
    borderColor: '#30363d',    // 기본 테두리
    borderAccent: '#1f6feb',   // 파란색 액센트 테두리
    accentBlue: '#1f6feb',     // 주 파란색
    accentLight: '#58a6ff',    // 밝은 파란색
    textPrimary: '#f0f6fc',    // 기본 텍스트
    textSecondary: '#8b949e',  // 부가 텍스트
} as const;

export type EditorColors = typeof colors;
