import type { PersonaSpec } from "../personas/types";
import type { SceneSpec, SceneEmotion } from "../scenes/types";

const emotions: SceneEmotion[] = [
  "friendly",
  "focused",
  "thinking",
  "confident",
  "explaining",
  "happy",
];

export function planDemoStoryboard(
  topic: string,
  persona: PersonaSpec,
  frameCount = 6,
): SceneSpec[] {
  const safeCount = Math.max(1, Math.min(frameCount, 9));

  return Array.from({ length: safeCount }, (_, index) => ({
    id: `scene-${persona.id}-${index + 1}`,
    personaId: persona.id,
    order: index + 1,
    purpose: index === 0 ? "introduce topic" : "develop story",
    emotion: emotions[index % emotions.length],
    emotionIntensity: 0.65,
    environment: index % 2 === 0 ? "modern studio" : "research workspace",
    pose: index % 2 === 0 ? "standing presenter" : "seated expert",
    action: index === 0 ? "introducing the topic" : "explaining the next point",
    wardrobe: index % 2 === 0 ? "business casual" : "smart casual",
    props: index % 2 === 0 ? ["display"] : ["notes", "laptop"],
    dialogue: `Кадр ${index + 1}: ${topic}`,
    camera: {
      shot: index === 0 ? "medium shot" : "medium close-up",
      angle: "eye level",
    },
  }));
}
