"""ATOM central MCP server — FastMCP 4, stateless HTTP + background tasks.

Corrections applied versus the original prototype, each verified against the
installed fastmcp 4.0.11 rather than assumed:

  1. `from fastmcp.extensions.tasks import TasksExtension`  -> `fastmcp_tasks`
     The module `fastmcp.extensions` does not exist; TasksExtension ships in the
     separate `fastmcp-tasks` distribution (`pip install "fastmcp[tasks]"`).
  2. `cache_scope="user"` -> `"private"`
     The constructor types cache_scope as Literal['public', 'private'].
  3. Registration order is load-bearing. Extensions must be registered before the
     server starts, and a `task=True` tool on a server with no tasks extension
     registered raises at startup. We register first, then declare tools.
  4. `/health` is added via @mcp.custom_route because a bare MCP endpoint has no
     liveness probe, and the deployment checks need one.

Background tasks are MCP's SEP-2663 extension: a supporting client gets a task ID
back immediately and polls for the result. Clients that do not negotiate the
extension still work - they just get the ordinary blocking result.

Run:  python mcp/server.py
      (or: fastmcp run mcp/server.py)
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Dict

from fastmcp import FastMCP
from fastmcp_tasks import TasksExtension
from starlette.requests import Request
from starlette.responses import PlainTextResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("atom-mcp")

HOST = os.getenv("ATOM_MCP_HOST", "127.0.0.1")
# Configurable on purpose: 5001 collides with a Windows svchost service on this
# workstation, so a hard-coded port fails to bind.
PORT = int(os.getenv("ATOM_MCP_PORT", "5002"))

mcp = FastMCP(
    name="ATOM_Central_Core",
    instructions=(
        "Central capability server for the ATOM ecosystem. "
        "Start with atom_system_health, then delegate code work to "
        "ultron_execute_code_task."
    ),
    cache_ttl=300,
    # "private": a cached result must never cross an authorization boundary.
    cache_scope="private",
)

# Register BEFORE any tool is declared and before the server starts.
mcp.add_extension(TasksExtension())


@mcp.tool(task=True)
async def ultron_execute_code_task(
    repo_path: str, instruction: str
) -> Dict[str, Any]:
    """งานพื้นหลังสำหรับ ULTRON Coder เพื่อสร้างและทดสอบโค้ดใน Sandbox

    Delegates a bounded code task to the ULTRON sandbox worker.

    NOTE: this is still the prototype stub. It sleeps and returns a canned
    summary rather than touching a repository. It must not be wired to a real
    PC worker until path validation and an allowlist are in place - an
    unrestricted `repo_path` on a machine that can run shell commands is a
    remote-code-execution surface.
    """
    await asyncio.sleep(2)
    return {
        "status": "COMPLETED",
        "worker": "ULTRON_PC_SANDBOX",
        "repo": repo_path,
        "instruction": instruction,
        "summary": "Generated surgical patch and passed all unit tests.",
        "stub": True,
    }


@mcp.tool
def atom_system_health(device_id: str) -> Dict[str, Any]:
    """ตรวจสอบสุขภาพของระบบตามฮาร์ดแวร์ที่ร้องขอเข้ามา"""
    return {
        "status": "ONLINE",
        "target_device": device_id,
        "quadro_p4000_vram_usage": "180MB / 8192MB",
        "system_ram_pool": "Active (128GB)",
        "protocol": "FastMCP 4.0 Stateless",
    }


@mcp.custom_route("/health", methods=["GET"])
async def health_check(request: Request) -> PlainTextResponse:
    """Liveness probe. Lists registered tools so configuration drift is visible."""
    names = sorted(t.name for t in await mcp.list_tools())
    return PlainTextResponse("ok\ntools: " + ", ".join(names))


if __name__ == "__main__":
    logger.info("starting ATOM MCP on %s:%s", HOST, PORT)
    mcp.run(transport="streamable-http", host=HOST, port=PORT)