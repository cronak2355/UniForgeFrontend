/**
 * 공통 타입 정의
 */

// 인증 모드 타입
export type AuthMode = 'login' | 'signup';

// 인증 폼 데이터 타입
export interface AuthFormData {
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
}

// Feature 카드 데이터 타입
export interface FeatureItem {
    icon: string;
    title: string;
    description: string;
}

// 체크리스트 아이템 타입
export interface CheckListItem {
    icon: string;
    text: string;
}
