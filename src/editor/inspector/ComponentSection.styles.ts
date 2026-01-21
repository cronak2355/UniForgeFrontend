/**
 * RuleSection 스타일 정의
 * 인라인 스타일을 분리하여 가독성 및 유지보수성 향상
 */

import { colors } from "../constants/colors";
import type { CSSProperties } from "react";

// ===== 섹션 레이아웃 =====
export const sectionContainer: CSSProperties = {
    padding: "16px",
    borderTop: `1px solid ${colors.borderColor}`,
    background: "rgba(0,0,0,0.2)"
};

export const sectionHeader: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
    gap: "8px",
    flexWrap: "nowrap", // Keep nowrap to stay on one line
    minWidth: 0 // Allow shrinking
};

export const sectionTitle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 700,
    color: colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    flexShrink: 0 // Title should not shrink
};

export const headerButtons: CSSProperties = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flex: 1, // Take available space
    minWidth: 0, // Allow shrinking
    justifyContent: "flex-end"
};

// ===== 템플릿 드롭다운 =====
export const presetSelectContainer: CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: "1 1 auto", // Allow shrink/grow
    minWidth: 0 // Allow shrinking small
};

export const presetSelect: CSSProperties = {
    background: colors.bgTertiary,
    color: colors.textSecondary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    fontSize: "11px",
    padding: "6px 24px 6px 10px",
    cursor: "pointer",
    appearance: "none",
    fontWeight: 500,
    width: "100%", // Full width of container
    minWidth: "60px", // Minimum usable width
    textAlign: "left",
    textOverflow: "ellipsis" // Show ellipsis if too small
};

export const presetIcon: CSSProperties = {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "8px",
    color: colors.textSecondary,
    pointerEvents: "none"
};

// ===== 버튼 스타일 =====
export const primaryButton: CSSProperties = {
    background: colors.accent,
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "10px",
    padding: "4px 8px",
    cursor: "pointer",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "4px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    transition: "background 0.2s",
    whiteSpace: "nowrap", // Keep text single line
    flexShrink: 0 // Do not shrink the primary button
};

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
    fontSize: "11px",
    opacity: 0.8
};

export const smallAddButton: CSSProperties = {
    background: "transparent",
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    color: colors.accentLight,
    cursor: "pointer",
    fontSize: "10px",
    padding: "2px 6px",
    fontWeight: 500
};

// ===== Rule 목록 =====
export const ruleList: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
};

export const emptyState: CSSProperties = {
    fontSize: "13px",
    color: colors.textMuted,
    textAlign: "center",
    padding: "32px 16px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: "8px",
    border: `1px dashed ${colors.borderColor}`,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "center"
};

// ===== Rule Item =====
export const ruleItemContainer: CSSProperties = {
    background: colors.bgSecondary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "6px",
    overflow: "hidden",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
};

export const ruleItemHeader: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    cursor: "pointer",
    background: colors.bgTertiary,
    borderBottom: `1px solid ${colors.borderColor}`
};

export const ruleItemTitle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: colors.textPrimary,
    display: "flex",
    alignItems: "center",
    gap: "6px"
};

export const ruleItemBody: CSSProperties = {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: colors.bgSecondary
};

// ===== 폼 요소 =====
export const label: CSSProperties = {
    fontSize: "11px",
    color: colors.textSecondary,
    display: "block",
    marginBottom: "4px",
    fontWeight: 500
};

export const selectField: CSSProperties = {
    width: "100%",
    background: colors.bgPrimary,
    color: colors.textPrimary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    fontSize: "11px",
    padding: "6px 8px",
    minWidth: 0,
    outline: "none"
};

export const smallSelect: CSSProperties = {
    flex: "1 1 60px",
    background: colors.bgPrimary,
    color: colors.textPrimary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    fontSize: "11px",
    padding: "4px 6px",
    minWidth: 50,
    outline: "none"
};

export const textInput: CSSProperties = {
    flex: "1 1 60px",
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    borderRadius: "4px",
    fontSize: "11px",
    padding: "4px 6px",
    minWidth: 50,
    width: "auto",
    outline: "none"
};

export const numberInput: CSSProperties = {
    flex: "1 1 70px",
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    borderRadius: "4px",
    fontSize: "11px",
    padding: "4px 6px",
    minWidth: 60,
    width: "auto",
    outline: "none"
};

export const smallNumberInput: CSSProperties = {
    flex: "1 1 60px",
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    borderRadius: "4px",
    fontSize: "10px",
    padding: "2px",
    minWidth: 50
};

// ===== Condition/Action 에디터 =====
export const conditionRow: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    alignItems: "center",
    padding: "6px",
    background: "rgba(255, 255, 255, 0.03)",
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    marginBottom: "4px"
};

export const actionRow: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px",
    background: "rgba(255, 255, 255, 0.03)",
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "4px",
    marginBottom: "6px",
};

export const actionHeader: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
};

export const actionParams: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    paddingLeft: "4px"
};

export const paramLabel: CSSProperties = {
    fontSize: "10px",
    color: colors.textSecondary
};

export const paramInputContainer: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "4px"
};
