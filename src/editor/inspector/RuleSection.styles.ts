/**
 * RuleSection 스타일 정의
 * 인라인 스타일을 분리하여 가독성 및 유지보수성 향상
 */

import { colors } from "../constants/colors";
import type { CSSProperties } from "react";

// ===== 섹션 레이아웃 =====
export const sectionContainer: CSSProperties = {
    padding: "12px 16px",
    borderTop: `1px solid ${colors.borderColor}`
};

export const sectionHeader: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px"
};

export const sectionTitle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: colors.accentLight,
    textTransform: "uppercase",
    letterSpacing: "0.5px"
};

export const headerButtons: CSSProperties = {
    display: "flex",
    gap: "4px"
};

// ===== 템플릿 드롭다운 =====
export const templateSelect: CSSProperties = {
    background: colors.bgTertiary,
    color: colors.accentLight,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    fontSize: "10px",
    padding: "3px 6px",
    cursor: "pointer"
};

// ===== 버튼 스타일 =====
export const addButton: CSSProperties = {
    background: colors.borderAccent,
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "10px",
    padding: "3px 8px",
    cursor: "pointer",
    fontWeight: 600
};

export const removeButton: CSSProperties = {
    background: "transparent",
    border: "none",
    color: "#da3633",
    cursor: "pointer",
    fontSize: "10px"
};

export const smallAddButton: CSSProperties = {
    background: "transparent",
    border: "none",
    color: colors.accentLight,
    cursor: "pointer",
    fontSize: "10px"
};

// ===== Rule 목록 =====
export const ruleList: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
};

export const emptyState: CSSProperties = {
    fontSize: "12px",
    color: colors.textSecondary,
    textAlign: "center",
    padding: "16px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: "8px",
    border: `1px dashed ${colors.borderColor}`
};

// ===== Rule Item =====
export const ruleItemContainer: CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "6px"
};

export const ruleItemHeader: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px",
    cursor: "pointer",
    background: "rgba(255,255,255,0.02)"
};

export const ruleItemTitle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: colors.textPrimary
};

export const ruleItemBody: CSSProperties = {
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
};

// ===== 폼 요소 =====
export const label: CSSProperties = {
    fontSize: "10px",
    color: colors.textSecondary,
    display: "block",
    marginBottom: "4px"
};

export const selectField: CSSProperties = {
    width: "100%",
    background: colors.bgTertiary,
    color: colors.textPrimary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    fontSize: "11px",
    padding: "4px 6px"
};

export const smallSelect: CSSProperties = {
    flex: 1,
    background: colors.bgTertiary,
    color: colors.textPrimary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    fontSize: "10px",
    padding: "2px 4px"
};

export const textInput: CSSProperties = {
    width: "60px",
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    borderRadius: "4px",
    fontSize: "10px",
    padding: "2px 4px"
};

export const numberInput: CSSProperties = {
    width: "40px",
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    borderRadius: "4px",
    fontSize: "10px",
    padding: "2px 4px"
};

export const smallNumberInput: CSSProperties = {
    width: "35px",
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    borderRadius: "4px",
    fontSize: "10px",
    padding: "2px"
};

// ===== Condition/Action 에디터 =====
export const conditionRow: CSSProperties = {
    display: "flex",
    gap: "4px",
    alignItems: "center",
    padding: "4px",
    background: "rgba(100,200,100,0.1)",
    borderRadius: "4px",
    marginBottom: "4px"
};

export const actionRow: CSSProperties = {
    display: "flex",
    gap: "4px",
    alignItems: "center",
    padding: "4px",
    background: "rgba(100,100,200,0.1)",
    borderRadius: "4px",
    marginBottom: "4px",
    flexWrap: "wrap"
};

export const paramLabel: CSSProperties = {
    fontSize: "9px",
    color: colors.textSecondary
};

export const paramInputContainer: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "2px"
};
