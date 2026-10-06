"""Live HTTP check against a running server.

Unlike test_mcp.py (in-memory), this connects over real HTTP to prove the
deployed transport works: handshake, tool listing, and a real tool call.

Usage:
    python server.py            # in one terminal
    python live_check.py        # in another

Override the target with ATOM_MCP_URL.
"""
import asyncio
import os

from fastmcp import Client

URL = os.getenv("ATOM_MCP_URL", "http://127.0.0.1:5002/mcp")


async def main() -> int:
    print(f"connecting to {URL}")
    async with Client(URL) as client:
        tools = sorted(t.name for t in await client.list_tools())
        print("TOOLS:", tools)
        assert tools == ["atom_system_health", "ultron_execute_code_task"], tools

        r = await client.call_tool("atom_system_health",
                                   {"device_id": "pc-workstation"})
        d = r.structured_content or r.data
        print("HEALTH:", d)
        assert d.get("target_device") == "pc-workstation", d

        r = await client.call_tool("ultron_execute_code_task",
                                   {"repo_path": "/tmp/x",
                                    "instruction": "fix the failing test"})
        d = r.structured_content or r.data
        print("TASK:", d)
        assert d.get("status") == "COMPLETED", d

    print("\nOK - live HTTP MCP round-trip works")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))