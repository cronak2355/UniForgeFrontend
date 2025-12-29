export type EditorEntity = {
    id: string;
    type: string;
    name: string;
    preview: string;
    x: number;
    y: number;
};

export type SceneState = {
    entities: EditorEntity[];
};
