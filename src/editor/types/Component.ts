export type ComponentType = "AutoRotate" | "Pulse";

export interface BaseComponent {
    id: string;
    type: ComponentType;
}

export interface AutoRotateComponent extends BaseComponent {
    type: "AutoRotate";
    speed: number; // degrees per second
}

export interface PulseComponent extends BaseComponent {
    type: "Pulse";
    speed: number;
    minScale: number;
    maxScale: number;
}

export type EditorComponent = AutoRotateComponent | PulseComponent;

export const ComponentDefaults: { [K in ComponentType]: Omit<Extract<EditorComponent, { type: K }>, "id"> } = {
    AutoRotate: { type: "AutoRotate", speed: 90 },
    Pulse: { type: "Pulse", speed: 2, minScale: 0.8, maxScale: 1.2 },
};
