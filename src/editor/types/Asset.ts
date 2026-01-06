export type Asset = {
    id: string;
    tag: string;
    name: string;
    url: string;
    //우선 얘는 타일일 경우, 타일셋에 몇번째 요소인지 설명해주는 변수임.
    idx: number;
};