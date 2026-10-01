from dataclasses import dataclass
from typing import Any

from father.runtime.core.registry import FatherRegistry


class NoModelAvailableError(RuntimeError):
    pass


@dataclass
class RouteResult:
    capability: str
    model_id: str
    model_type: str
    config: dict[str, Any]


class CapabilityRouter:

    def __init__(
        self,
        registry: FatherRegistry | None = None,
    ):
        self.registry = registry or FatherRegistry()

    def route(
        self,
        capability: str,
        agent: str | None = None,
    ) -> RouteResult:

        if agent:
            agent_config = self.registry.get_agent(agent)

            if not agent_config:
                raise ValueError(
                    f"Unknown FATHER agent: {agent}"
                )

            allowed = agent_config.get(
                "capabilities",
                [],
            )

            if capability not in allowed:
                raise PermissionError(
                    f"Agent '{agent}' is not allowed "
                    f"to use capability '{capability}'"
                )

        models = (
            self.registry
            .get_models_for_capability(capability)
        )

        if not models:
            raise NoModelAvailableError(
                f"No model available for "
                f"capability '{capability}'"
            )

        selected = models[0]

        return RouteResult(
            capability=capability,
            model_id=selected["id"],
            model_type=selected["type"],
            config=selected,
        )


if __name__ == "__main__":

    router = CapabilityRouter()

    tests = [
        "text.generate",
        "speech.to_text",
        "speech.synthesize",
        "image.generate",
        "knowledge.embed",
        "knowledge.rerank",
    ]

    print("FATHER Capability Router")
    print("-" * 60)

    for capability in tests:

        route = router.route(
            capability=capability,
            agent="alina",
        )

        print(
            f"{capability:<24}"
            f" -> "
            f"{route.model_id}"
        )
