from pathlib import Path
from typing import Any

import yaml


class FatherRegistry:
    """
    Central registry for FATHER Runtime.

    Contains:
    - capabilities
    - models
    - agents
    """

    def __init__(self, registry_dir: Path | None = None):
        if registry_dir is None:
            registry_dir = (
                Path(__file__).resolve().parent.parent / "registry"
            )

        self.registry_dir = registry_dir

        self.capabilities = self._load_yaml("capabilities.yaml")
        self.models = self._load_yaml("models.yaml")
        self.agents = self._load_yaml("agents.yaml")

    def _load_yaml(self, filename: str) -> dict[str, Any]:
        path = self.registry_dir / filename

        if not path.exists():
            raise FileNotFoundError(
                f"FATHER registry file not found: {path}"
            )

        with path.open(
            "r",
            encoding="utf-8-sig",
        ) as file:
            data = yaml.safe_load(file)

        return data or {}

    def get_models_for_capability(
        self,
        capability: str,
    ) -> list[dict[str, Any]]:

        result = []

        models = self.models.get("models", {})

        for model_id, config in models.items():

            capabilities = config.get(
                "capabilities",
                [],
            )

            if (
                capability in capabilities
                and config.get("enabled", True)
            ):
                result.append(
                    {
                        "id": model_id,
                        **config,
                    }
                )

        return result

    def get_agent(self, agent_id: str):
        return (
            self.agents
            .get("agents", {})
            .get(agent_id)
        )


if __name__ == "__main__":

    registry = FatherRegistry()

    print("FATHER Registry OK")
    print()

    for capability in registry.capabilities.get(
        "capabilities",
        {}
    ):
        models = registry.get_models_for_capability(
            capability
        )

        print(
            f"{capability:<24} "
            f"{len(models)} model(s)"
        )
