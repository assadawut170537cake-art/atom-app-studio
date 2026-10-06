"""End-to-end test for the ATOM MCP server.

Drives a real FastMCP Client in-memory over the ASGI app, so this covers
registration, schema generation, tool dispatch and the custom route - not just
that the module imports.

Run:  python mcp/test_mcp.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastmcp import Client  # noqa: E402
from fastmcp_tasks import TasksExtension  # noqa: E402

import server as atom_mcp  # noqa: E402

passed = 0
failed = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  PASS  {name}")
    else:
        failed += 1
        print(f"  FAIL  {name}  {detail}")


async def main() -> int:
    print("\n[1] server construction")
    check("server built", atom_mcp.mcp is not None)

    # Use the public API rather than private internals: an earlier draft of this
    # test guessed at `_tool_manager` and crashed on a missing attribute.
    registered = await atom_mcp.mcp.list_tools()
    names = sorted(t.name for t in registered)
    check("both tools registered",
          names == ["atom_system_health", "ultron_execute_code_task"], str(names))

    # Docket is the task backend; it must actually register our task tool, or
    # background execution silently never runs.
    docket_tools = atom_mcp.mcp._extension_runtime is not None
    check("task extension runtime present", docket_tools)
    ext_ids = sorted(atom_mcp.mcp._extensions.keys())
    check("tasks extension registered",
          any("task" in i.lower() for i in ext_ids), str(ext_ids))

    print("\n[2] in-memory client round-trip")
    async with Client(atom_mcp.mcp) as client:
        tools = await client.list_tools()
        tool_names = sorted(t.name for t in tools)
        check("client sees both tools",
              tool_names == ["atom_system_health", "ultron_execute_code_task"],
              str(tool_names))

        # Schema generation: a broken type annotation shows up here.
        # NB: `inputSchema` is deprecated in MCP SDK v2; `input_schema` is current.
        health = next(t for t in tools if t.name == "atom_system_health")
        hprops = getattr(health, "input_schema", None) or health.inputSchema
        check("health tool has device_id param",
              "device_id" in (hprops.get("properties") or {}), str(hprops))

        task = next(t for t in tools if t.name == "ultron_execute_code_task")
        tprops = getattr(task, "input_schema", None) or task.inputSchema
        props = tprops.get("properties") or {}
        check("task tool params typed",
              props.get("repo_path", {}).get("type") == "string"
              and props.get("instruction", {}).get("type") == "string",
              str(props))

        print("\n[3] tool calls")
        res = await client.call_tool(
            "atom_system_health", {"device_id": "pc-workstation"}
        )
        data = res.structured_content or res.data
        check("health returns device id",
              data.get("target_device") == "pc-workstation", str(data))
        check("health reports protocol",
              "FastMCP" in str(data.get("protocol")), str(data.get("protocol")))

        res = await client.call_tool(
            "ultron_execute_code_task",
            {"repo_path": "/tmp/demo", "instruction": "add a unit test"},
        )
        data = res.structured_content or res.data
        check("task tool returns status",
              data.get("status") == "COMPLETED", str(data))
        check("task tool echoes repo", data.get("repo") == "/tmp/demo", str(data))
        check("task tool marked as stub", data.get("stub") is True, str(data))

    print("\n[4] input validation")
    async with Client(atom_mcp.mcp) as client:
        try:
            await client.call_tool("atom_system_health", {})
            check("missing required arg rejected", False, "no error raised")
        except Exception:
            check("missing required arg rejected", True)

        try:
            await client.call_tool("no_such_tool", {})
            check("unknown tool rejected", False, "no error raised")
        except Exception:
            check("unknown tool rejected", True)

    print("\n[5] HTTP surface")
    app = atom_mcp.mcp.http_app()
    routes = [getattr(r, "path", "") for r in getattr(app, "routes", [])]
    check("/health route registered", "/health" in routes, str(routes))
    check("/mcp endpoint registered", "/mcp" in routes, str(routes))

    print(f"\n{'=' * 46}")
    print(f"  passed: {passed}   failed: {failed}")
    print(f"{'=' * 46}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))