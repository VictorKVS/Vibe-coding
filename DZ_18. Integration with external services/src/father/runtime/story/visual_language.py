from __future__ import annotations

from typing import Dict, List


# Artistic comic-design vocabulary.
# Never use this table to infer real personality
# from facial anatomy.

COMIC_TRAIT_MAP: Dict[str, Dict[str, List[str]]] = {

    "analytical": {
        "behavior": [
            "observes before acting",
            "checks details",
        ],
        "speech": [
            "precise",
            "measured",
        ],
        "expression": [
            "focused gaze",
            "restrained expression",
        ],
        "pose": [
            "controlled posture",
            "economical gestures",
        ],
        "shape_language": [
            "rectangular",
            "angular",
        ],
    },

    "reserved": {
        "behavior": [
            "keeps social distance",
            "limits visible reactions",
        ],
        "speech": [
            "short answers",
            "low emotional display",
        ],
        "expression": [
            "subtle microexpressions",
        ],
        "pose": [
            "compact posture",
        ],
        "shape_language": [
            "vertical",
            "contained",
        ],
    },

    "confident": {
        "behavior": [
            "acts decisively",
            "occupies space",
        ],
        "speech": [
            "direct",
            "declarative",
        ],
        "expression": [
            "steady gaze",
        ],
        "pose": [
            "open posture",
            "stable stance",
        ],
        "shape_language": [
            "square",
            "broad",
        ],
    },

    "impulsive": {
        "behavior": [
            "acts before full analysis",
            "reacts quickly",
        ],
        "speech": [
            "interrupts",
            "fast cadence",
        ],
        "expression": [
            "large rapid reactions",
        ],
        "pose": [
            "dynamic asymmetry",
            "sharp gestures",
        ],
        "shape_language": [
            "diagonal",
            "triangular",
        ],
    },

    "anxious": {
        "behavior": [
            "checks surroundings",
            "anticipates threats",
        ],
        "speech": [
            "asks for confirmation",
        ],
        "expression": [
            "tense gaze",
            "visible vigilance",
        ],
        "pose": [
            "protective posture",
        ],
        "shape_language": [
            "compressed",
            "uneven",
        ],
    },

    "empathetic": {
        "behavior": [
            "notices reactions of others",
            "reduces interpersonal distance",
        ],
        "speech": [
            "asks personal questions",
            "softens disagreement",
        ],
        "expression": [
            "responsive face",
            "soft gaze",
        ],
        "pose": [
            "open orientation toward others",
        ],
        "shape_language": [
            "round",
            "soft",
        ],
    },

    "authoritative": {
        "behavior": [
            "directs other characters",
            "controls interaction",
        ],
        "speech": [
            "imperative",
            "concise",
        ],
        "expression": [
            "steady controlled gaze",
        ],
        "pose": [
            "upright dominant posture",
        ],
        "shape_language": [
            "square",
            "vertical",
        ],
    },

    "secretive": {
        "behavior": [
            "withholds information",
            "avoids direct disclosure",
        ],
        "speech": [
            "partial answers",
            "redirects questions",
        ],
        "expression": [
            "controlled ambiguity",
        ],
        "pose": [
            "partial turn away",
        ],
        "shape_language": [
            "asymmetric",
            "obscured",
        ],
    },
}


def comic_design_for_traits(
    traits: List[str],
) -> Dict[str, List[str]]:

    result = {
        "behavior": [],
        "speech": [],
        "expression": [],
        "pose": [],
        "shape_language": [],
    }

    for trait in traits:

        entry = COMIC_TRAIT_MAP.get(
            trait.lower()
        )

        if not entry:
            continue

        for key, values in entry.items():

            for value in values:

                if value not in result[key]:
                    result[key].append(
                        value
                    )

    return result
