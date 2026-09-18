# Storyboard module

Owns content-generation orchestration only.

It may transform a validated ContentBrief into scenes, dialogue, camera directions and provider jobs.

It must not alter the verified factual basis from ResearchPacket. When research is insufficient or conflicting, return a ResearchReturnRequest through the shared contract.
