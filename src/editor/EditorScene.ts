import Phaser from "phaser";
import type { EditorEntity } from "./types/Entity";

/**
 * EditorScene
 * - 에디터에서 엔티티(스프라이트)를 표시하고 드래그로 이동할 수 있게 하는 Phaser 씬입니다.
 * - 외부에서 엔티티 목록을 전달하면 `syncEntities`로 씬 내 오브젝트를 동기화합니다.
 */
export class EditorScene extends Phaser.Scene {
    // id -> Phaser Image 맵 (씬 내에 표시된 엔티티들)
    private sprites = new Map<string, Phaser.GameObjects.Image>();

    // 외부(호스트 컴포넌트)에게 엔티티가 이동되었음을 알리기 위한 콜백
    public onEntityMove?: (id: string, x: number, y: number) => void;

    // 드래그-드랍용 미리보기(유령) 이미지
    private ghost?: Phaser.GameObjects.Image;

    // 씬이 준비(생성)되었는지 여부
    private ready = false;

    // 씬이 아직 준비되지 않은 상태에서 전달된 엔티티 목록을 임시로 보관
    private pendingEntities: EditorEntity[] | null = null;

    // 리소스 미리 로드 (플레이스홀더 이미지)
    preload() {
        this.load.image("preview", "placeholder.png");
    }

    // 씬 생성 시 초기화
    create() {
        this.ready = true;

        // 준비되기 전에 전달된 엔티티가 있다면 동기화 처리
        if (this.pendingEntities) {
            this.syncEntities(this.pendingEntities);
            this.pendingEntities = null;
        }
    }

    /**
     * 씬 내 표시된 엔티티를 주어진 목록으로 동기화
     * - 씬이 준비되지 않았으면 목록을 보관만 함
     * - 준비되었으면 기존 자식/스프라이트를 제거하고 새로 생성
     */
    syncEntities(entities: EditorEntity[]) {
        if (!this.ready) {
            this.pendingEntities = entities;
            return;
        }

        // 기존 표시 객체 제거
        this.children.removeAll();
        this.sprites.clear();

        // 새 엔티티마다 이미지 생성 및 드래그 가능 설정
        entities.forEach((e) => {
            const sprite = this.add.image(e.x, e.y, "preview");
            sprite.setData("id", e.id);
            sprite.setInteractive({ draggable: true });

            // Phaser 입력 시스템에 드래그 가능 대상으로 등록
            this.input.setDraggable(sprite);

            // 드래그 중에는 위치를 업데이트
            sprite.on("drag", (_p: any, x: number, y: number) => {
                sprite.setPosition(x, y);
            });

            // 드래그가 끝나면 외부 콜백으로 새 위치 알림
            sprite.on("dragend", () => {
                this.onEntityMove?.(e.id, sprite.x, sprite.y);
            });

            this.sprites.set(e.id, sprite);
        });
    }

    /**
     * 마우스나 드래그 과정에서 위치를 시각적으로 보여주기 위한 유령(ghost) 표시
     * - 아직 씬이 준비되지 않았다면 무시
     */
    showGhost(x: number, y: number) {
        if (!this.ready) return;

        if (!this.ghost) {
            this.ghost = this.add.image(x, y, "preview");
            this.ghost.setAlpha(0.5); // 반투명
            this.ghost.setScale(0.5); // 작게 표시
        } else {
            this.ghost.setPosition(x, y);
        }
    }

    // 유령 제거
    hideGhost() {
        this.ghost?.destroy();
        this.ghost = undefined;
    }
}
