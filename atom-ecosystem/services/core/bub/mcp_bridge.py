"""MCP and Agent Skills Unified Bridge for ATOM Ecosystem."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List

from .discovery import SkillMetadata, discover_skills, render_skills_prompt
from .framework import BubFramework


@dataclass
class MCPTool:
    """Model Context Protocol (MCP) tool representation."""

    name: str
    description: str
    handler: Callable[..., Any]
    parameters_schema: Dict[str, Any] = field(default_factory=dict)

    async def execute(self, **kwargs: Any) -> Any:
        if asyncio.iscoroutinefunction(self.handler):
            return await self.handler(**kwargs)
        return self.handler(**kwargs)


class UnifiedMCPAndSkillsEngine:
    """Unified engine that bridges MCP Servers (Tools) and Agent Skills (Workflows)."""

    def __init__(self, workspace_path: Path | None = None) -> None:
        self.workspace_path = (workspace_path or Path.cwd()).resolve()
        self.framework = BubFramework()
        self.mcp_tools: Dict[str, MCPTool] = {}
        self.skills: List[SkillMetadata] = []

    def register_mcp_tool(
        self,
        name: str,
        description: str,
        handler: Callable[..., Any],
        parameters_schema: Dict[str, Any] | None = None,
    ) -> None:
        """Register an MCP tool into the execution engine."""
        self.mcp_tools[name] = MCPTool(
            name=name,
            description=description,
            handler=handler,
            parameters_schema=parameters_schema or {},
        )

    def load_project_skills(self) -> List[SkillMetadata]:
        """Discover and load all Agent Skills from workspace."""
        self.skills = discover_skills(self.workspace_path)
        return self.skills

    def generate_unified_prompt(self, expanded_skills: List[str] | None = None) -> str:
        """Generate a system prompt containing both MCP tools and Agent Skills."""
        prompt_parts: List[str] = []

        # 1. Available MCP Tools
        if self.mcp_tools:
            prompt_parts.append("<mcp_tools>")
            for name, tool in self.mcp_tools.items():
                prompt_parts.append(f"- {name}: {tool.description}")
            prompt_parts.append("</mcp_tools>\n")

        # 2. Available Agent Skills (Progressive Disclosure)
        skills_prompt = render_skills_prompt(self.skills, expanded_skills or [])
        if skills_prompt:
            prompt_parts.append(skills_prompt)

        return "\n".join(prompt_parts)

    async def execute_mcp_tool(self, tool_name: str, **kwargs: Any) -> Any:
        """Execute a registered MCP tool by name."""
        if tool_name not in self.mcp_tools:
            raise KeyError(f"MCP Tool '{tool_name}' not found")
        return await self.mcp_tools[tool_name].execute(**kwargs)
