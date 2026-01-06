import { SceneRegistry } from "../core/scene/SceneRegistry";
import { EmptyScene } from "../core/scene/EmptyScene";

SceneRegistry.register("empty", () => new EmptyScene());
