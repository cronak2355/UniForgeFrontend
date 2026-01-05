import React from "react";

type Props = {
  children: React.ReactNode;
};

/**
 * InspectorScroll
 * - Inspector 내부 스크롤 영역 전담 컴포넌트
 * - 이 컴포넌트가 유지되는 한 스크롤 위치는 유지됨
 */
export function InspectorScroll({ children }: Props) {
  return (
    <div className="inspector-scroll">
      {children}
    </div>
  );
}