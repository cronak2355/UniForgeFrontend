export type TriggerType =
  | "OnStart"
  | "OnInteract"
  | "OnEnterArea"
  | "OnVariableEqual"
  | "OnClick"; // UI Click

export type ActionType =
  | "ShowText"
  | "SetVariable"
  | "ChangeMap"
  | "MoveEntity"
  | "SpawnEntity"
  | "PlaySound"
  | "PlayAnimation"
  | "Log"       // Debug log
  | "OpenUrl";  // Open external link

/**
 * Entity에 부착되는 이벤트 데이터 구조
 */
export interface EditorEvent {
  id: string;
  trigger: TriggerType;
  action: ActionType;
  payload?: any; // Action settings (e.g. message, url)
}
