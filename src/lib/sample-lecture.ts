import type { StudyDoc } from "@/lib/types"

export const SAMPLE_LECTURE_ID = "sample-wound-healing"

export function isSampleLectureId(id: string) {
  return id === SAMPLE_LECTURE_ID || id === "sample"
}

export function sampleWoundHealingLecture(): StudyDoc {
  return {
    id: SAMPLE_LECTURE_ID,
    name: "Wound healing for reconstructive surgery",
    kind: "text",
    createdAt: new Date().toISOString(),
    slides: [
      {
        index: 1,
        title: "Why wound healing matters",
        text: "Every reconstructive plan is a bet on wound healing. Infection, tension, ischemia, radiation, smoking, and uncontrolled diabetes all delay repair. Before you choose a flap or a graft, ask whether the wound bed can actually close.",
      },
      {
        index: 2,
        title: "Three overlapping phases",
        text: "Wound healing has three overlapping phases: inflammation, proliferation, and remodeling. Inflammation lasts about 0 to 4 days. Proliferation runs from day 3 to about 3 weeks. Remodeling can continue for 12 to 18 months. There is no hard stop between phases.",
      },
      {
        index: 3,
        title: "Hemostasis and inflammation",
        text: "After injury, platelets form a fibrin clot and release platelet-derived growth factor and transforming growth factor beta. Neutrophils arrive first to clear bacteria. Macrophages follow and orchestrate the transition from inflammation to repair. Persistent neutrophils mean infection or a foreign body.",
      },
      {
        index: 4,
        title: "Proliferation",
        text: "In the proliferative phase, fibroblasts lay down type III collagen. Angiogenesis brings a new capillary network. Keratinocytes migrate across the wound in epithelialization. Granulation tissue is beefy red because it is full of new vessels. A pale or necrotic bed will not take a graft.",
      },
      {
        index: 5,
        title: "Remodeling and strength",
        text: "During remodeling, type III collagen is replaced by stronger type I collagen. Wound tensile strength is only about 20 percent of normal at 3 weeks and reaches about 80 percent of original strength by 1 year. It never returns to 100 percent. That is why late scar rupture can still happen under high tension.",
      },
      {
        index: 6,
        title: "Healing by intention",
        text: "Primary intention is a clean, approximated wound, such as a surgical incision. Secondary intention heals by granulation from the base, used for contaminated or gapped wounds. Tertiary intention, or delayed primary closure, waits until the bed is clean, then closes. Choose intention based on contamination and tension, not convenience.",
      },
      {
        index: 7,
        title: "Grafts versus flaps",
        text: "A skin graft is tissue without its own blood supply. It survives by imbibition, then inosculation, then neovascularization. A flap brings its own blood supply and is required when the bed is poorly vascularized, when you need bulk, or when you are covering bone, tendon, or hardware. Full-thickness grafts contract less than split-thickness grafts.",
      },
      {
        index: 8,
        title: "Factors that sabotage healing",
        text: "Local enemies are tension, hematoma, dead space, radiation, and arterial or venous insufficiency. Systemic enemies are smoking, hyperglycemia, malnutrition, steroids, and immunosuppression. Nicotine causes vasoconstriction. Aim for glucose under 180 milligrams per deciliter around the time of surgery when you can.",
      },
      {
        index: 9,
        title: "Clinical checkpoints",
        text: "A graft that is purple and adherent at day 5 is usually taking. A graft that is floating on serum is not. Flap checks look at color, warmth, turgor, and capillary refill. A pale cold flap is arterial. A purple congested flap is venous. Both are emergencies. Document the time you noticed the change.",
      },
      {
        index: 10,
        title: "Take-home for rounds",
        text: "Name the healing phase. Name the closure intention. Say whether the bed can support a graft or needs a flap. List one local and one systemic factor you will fix before you operate. If you can do that out loud, you are thinking like a reconstructive surgeon.",
      },
    ],
  }
}
