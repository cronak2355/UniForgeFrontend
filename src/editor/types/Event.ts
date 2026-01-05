export type TriggerType =
  | "OnStart"
  | "OnInteract"
  | "OnEnterArea"
  | "OnVariableEqual";

export type ActionType =
| "ShowText"
| "SetVariable"
| "ChangeMap"
| "MoveEntity"
| "SpawnEntity"
| "PlaySound";

/**
 * Entity에 부착되는 이벤트 데이터 구조
 */
export interface EditorEvent {
  id: string;
  trigger: TriggerType;
  action: ActionType;
}
