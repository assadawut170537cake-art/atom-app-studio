"""Composable Bub framework runtime."""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

import pluggy
import typer
from dotenv import find_dotenv, load_dotenv

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("bub")

from . import configure

try:
    from bub.channels.admission import AdmitDecision, SteeringInbox, TurnSnapshot
    from bub.channels.contracts import ChannelRouter, MessageHandler
    from bub.envelope import Envelope, content_of, field_of, unpack_batch
    from bub.environment import ENVIRONMENT_STATE_KEY, Environment
    from bub.errors import BubError, ErrorKind
    from bub.hooks.interception import AgentHooks
    from bub.hooks.runtime import _SKIP_VALUE, HookRuntime
    from bub.hooks.specs import BUB_HOOK_NAMESPACE, BubHookSpecs
    from bub.model_selection import ModelOptions
    from bub.sidecars import TapeSidecar
    from bub.store import AsyncTapeStore, TapeStore
    from bub.streaming import StreamState
    from bub.tape import Tape, TapeContext
    from bub.turn import TurnResult, TurnState
    from bub.utils import maybe_context_manager
except ImportError:
    # Minimal type stubs when running outside full bub distribution
    AdmitDecision = Any
    SteeringInbox = Any
    TurnSnapshot = Any
    ChannelRouter = Any
    MessageHandler = Any
    Envelope = Any
    Environment = Any
    BUB_HOOK_NAMESPACE = "bub"
    BubHookSpecs = object
    ENVIRONMENT_STATE_KEY = "env"
    _SKIP_VALUE = object()

    def content_of(msg: Any) -> str:
        return str(msg)

    def field_of(msg: Any, key: str, default: Any = None) -> Any:
        if isinstance(msg, dict):
            return msg.get(key, default)
        return getattr(msg, key, default)

    def unpack_batch(batch: Any) -> list:
        if isinstance(batch, list):
            return batch
        return [batch]

    class HookRuntime:
        def __init__(self, pm: Any) -> None:
            self.pm = pm
        async def call_first(self, *args, **kwargs) -> Any: return None
        async def call_many(self, *args, **kwargs) -> list: return []
        def call_many_sync(self, *args, **kwargs) -> list: return []
        def call_first_sync(self, *args, **kwargs) -> Any: return None
        def _iter_hookimpls(self, *args, **kwargs) -> list: return []
        def _invoke_impl_sync(self, *args, **kwargs) -> Any: return None
        async def run_model(self, *args, **kwargs) -> Any: return None
        async def run_model_stream(self, *args, **kwargs) -> Any: return None
        async def notify_error(self, *args, **kwargs) -> None: pass
        def hook_report(self) -> dict: return {}

    class AgentHooks:
        def __init__(self, hr: Any) -> None:
            self.hr = hr

    class ModelOptions:
        def __init__(self, models: list | None = None, current_model: Any = None) -> None:
            self.models = models or []
            self.current_model = current_model

    TapeSidecar = Any
    TapeStore = Any
    AsyncTapeStore = Any
    StreamState = Any
    Tape = Any
    TapeContext = Any
    TurnResult = Any
    TurnState = dict

    async def maybe_context_manager(obj: Any, stack: Any) -> Any:
        return obj

if TYPE_CHECKING:
    from bub.channels.base import Channel

load_dotenv(find_dotenv(usecwd=True))
DEFAULT_HOME = Path.home() / ".bub"
DEFAULT_CONFIG_FILE = (DEFAULT_HOME / "config.yml").resolve()


@dataclass(frozen=True)
class PluginStatus:
    is_success: bool
    detail: str | None = None


class BubFramework:
    """Minimal framework core. Everything grows from hook skills."""

    def __init__(self, config_file: Path = DEFAULT_CONFIG_FILE) -> None:
        """Create a hook runtime and load the process-wide configuration file.

        The workspace initially points to the current directory. Register plugins
        or load builtin hooks before executing turns; construction does not load them.
        """
        self.workspace = Path.cwd().resolve()
        self.config_file = config_file.resolve()
        self._plugin_manager = pluggy.PluginManager(BUB_HOOK_NAMESPACE)
        if BubHookSpecs is not object:
            self._plugin_manager.add_hookspecs(BubHookSpecs)
        self._hook_runtime = HookRuntime(self._plugin_manager)
        self._agent_hooks = AgentHooks(self._hook_runtime)
        self._plugin_status: dict[str, PluginStatus] = {}
        self._channel_router: ChannelRouter | None = None
        self._tape_store: TapeStore | AsyncTapeStore | None = None
        self._steering_inbox: SteeringInbox | None = None
        self._environments: dict[str, Environment | None] = {}
        configure.load(self.config_file)

    @property
    def plugin_manager(self) -> pluggy.PluginManager:
        return self._plugin_manager

    def load_builtin_hooks(self) -> None:
        """Load Bub's builtin hook implementations."""
        try:
            from bub.builtin.hook_impl import BuiltinImpl
            impl = BuiltinImpl(self)
            self._plugin_manager.register(impl, name="builtin")
            self._plugin_status["builtin"] = PluginStatus(is_success=True)
        except Exception as exc:
            self._plugin_status["builtin"] = PluginStatus(is_success=False, detail=str(exc))

    def load_hooks(self) -> None:
        """Load builtin hooks, then plugins from the ``bub`` entry-point group."""
        import importlib.metadata

        pending_plugins: list[tuple[str, Any]] = []

        self.load_builtin_hooks()
        try:
            for entry_point in importlib.metadata.entry_points(group="bub"):
                try:
                    plugin = entry_point.load()
                except Exception as exc:
                    logger.warning(f"Failed to load plugin '{entry_point.name}': {exc}")
                    self._plugin_status[entry_point.name] = PluginStatus(is_success=False, detail=str(exc))
                else:
                    pending_plugins.append((entry_point.name, plugin))
        except Exception:
            pass

        for plugin_name, plugin in pending_plugins:
            try:
                if callable(plugin):  # Support entry points that are classes
                    plugin = plugin(self)
                self._plugin_manager.register(plugin, name=plugin_name)
            except Exception as exc:
                logger.warning(f"Failed to initialize plugin '{plugin_name}': {exc}")
                self._plugin_status[plugin_name] = PluginStatus(is_success=False, detail=str(exc))
            else:
                self._plugin_status[plugin_name] = PluginStatus(is_success=True)

    def create_cli_app(self) -> typer.Typer:
        """Create CLI app by collecting commands from hooks."""
        app = typer.Typer(name="bub", help="A tiny agent runtime, composable with plugins", add_completion=False)

        @app.callback(invoke_without_command=True)
        def _main(
            ctx: typer.Context,
            workspace: str | None = typer.Option(None, "--workspace", "-w", help="Path to the workspace"),
        ) -> None:
            if workspace:
                self.workspace = Path(workspace).resolve()
            ctx.obj = self

        self._hook_runtime.call_many_sync("register_cli_commands", app=app)
        return app

    async def build_prompt(
        self, message: Envelope, session_id: str, state: dict[str, Any]
    ) -> str | list[dict[str, Any]]:
        """Build prompt for one message turn."""
        prompt = await self._hook_runtime.call_first(
            "build_prompt", message=message, session_id=session_id, state=state
        )
        if not prompt:
            prompt = content_of(message)
        return cast("str | list[dict[str, Any]]", prompt)

    async def continue_prompt(self, prompt: str | list[dict] | None, tape: Tape, state: StreamState) -> str | None:
        """Return an optional user message for the next step of an agent loop."""
        next_prompt = await self._hook_runtime.call_first("continue_prompt", prompt=prompt, tape=tape, state=state)
        if next_prompt is None or isinstance(next_prompt, str):
            return next_prompt
        raise TypeError("hook.continue_prompt must return str or None")

    async def build_state(self, message: Envelope, session_id: str) -> TurnState:
        state: TurnState = {
            "_runtime_workspace": str(self.workspace),
            "_runtime_steering_inbox": self.get_steering_inbox(),
        }
        if (environment := await self.get_environment(session_id)) is not None:
            state["ENVIRONMENT_STATE_KEY"] = environment
        for hook_state in reversed(
            await self._hook_runtime.call_many("load_state", message=message, session_id=session_id)
        ):
            if isinstance(hook_state, dict):
                state.update(hook_state)
        return state

    async def process_inbound(self, inbound: Envelope, stream_output: bool = False) -> TurnResult:
        try:
            session_id = await self.resolve_session(inbound)
            if isinstance(inbound, dict):
                inbound.setdefault("session_id", session_id)
            state = await self.build_state(inbound, session_id)
            prompt = await self.build_prompt(inbound, session_id, state)
            model_output = ""
            try:
                model_output = await self._run_model(inbound, prompt, session_id, state, stream_output)
            finally:
                await self._hook_runtime.call_many(
                    "save_state",
                    session_id=session_id,
                    state=state,
                    message=inbound,
                    model_output=model_output,
                )

            outbounds = await self._collect_outbounds(inbound, session_id, state, model_output)
            for outbound in outbounds:
                await self._hook_runtime.call_many("dispatch_outbound", message=outbound)
            return TurnResult(
                session_id=session_id,
                prompt=prompt,
                model_output=model_output,
                outbounds=outbounds,
                state=state,
            )
        except Exception as exc:
            logger.exception("Error processing inbound message")
            await self._hook_runtime.notify_error(stage="turn", error=exc, message=inbound)
            raise

    async def resolve_session(self, message: Envelope) -> str:
        resolved = await self._hook_runtime.call_first("resolve_session", message=message)
        return str(resolved or self._default_session_id(message))

    async def _run_model(
        self,
        inbound: Envelope,
        prompt: str | list[dict],
        session_id: str,
        state: dict[str, Any],
        stream_output: bool,
    ) -> str:
        output = await self._hook_runtime.run_model(prompt=prompt, session_id=session_id, state=state)
        if output is None:
            return prompt if isinstance(prompt, str) else content_of(inbound)
        return output

    def hook_report(self) -> dict[str, list[str]]:
        return self._hook_runtime.hook_report()

    def bind_channel_router(self, router: ChannelRouter | None) -> None:
        self._channel_router = router

    async def dispatch_via_channel_router(self, message: Envelope) -> bool:
        if self._channel_router is None:
            return False
        return await self._channel_router.dispatch_output(message)

    async def quit_via_channel_router(self, session_id: str) -> None:
        if self._channel_router is not None:
            await self._channel_router.quit(session_id)

    async def admit_message(self, *, session_id: str, message: Envelope, turn: TurnSnapshot) -> AdmitDecision | None:
        decision = await self._hook_runtime.call_first(
            "admit_message",
            session_id=session_id,
            message=message,
            turn=turn,
        )
        return decision

    async def get_model_options(
        self,
        *,
        session_id: str,
        workspace: str | Path | None = None,
    ) -> ModelOptions:
        resolved_workspace = self._resolve_workspace(workspace)
        results = await self._hook_runtime.call_many(
            "provide_model_options",
            session_id=session_id,
            workspace=resolved_workspace,
        )

        merged = ModelOptions()
        for result in results:
            if result is None:
                continue
            if isinstance(result, ModelOptions):
                merged = ModelOptions(
                    models=[*merged.models, *result.models],
                    current_model=merged.current_model or result.current_model,
                )
        return merged

    def _resolve_workspace(self, workspace: str | Path | None) -> Path:
        if workspace is None:
            return self.workspace
        return Path(workspace).expanduser().resolve()

    async def steer_message(
        self,
        *,
        message: Envelope,
        session_id: str,
        state: TurnState,
        reason: str | None = None,
    ) -> bool:
        inbox = self.get_steering_inbox()
        if inbox is None:
            return False
        state.setdefault("session_id", session_id)
        if reason is not None:
            with contextlib.suppress(AttributeError):
                message.context = {**field_of(message, "context", {}), "steering_reason": reason}
        await inbox.enqueue_message(message, state)
        return True

    @staticmethod
    def _default_session_id(message: Envelope) -> str:
        session_id = field_of(message, "session_id")
        if session_id is not None:
            return str(session_id)
        channel = str(field_of(message, "channel", "default"))
        chat_id = str(field_of(message, "chat_id", "default"))
        return f"{channel}:{chat_id}"

    async def _collect_outbounds(
        self,
        message: Envelope,
        session_id: str,
        state: dict[str, Any],
        model_output: str,
    ) -> list[Envelope]:
        batches = await self._hook_runtime.call_many(
            "render_outbound",
            message=message,
            session_id=session_id,
            state=state,
            model_output=model_output,
        )
        outbounds: list[Envelope] = []
        for batch in batches:
            outbounds.extend(unpack_batch(batch))
        if outbounds:
            return outbounds

        fallback: dict[str, Any] = {
            "content": model_output,
            "session_id": session_id,
        }
        channel = field_of(message, "channel")
        chat_id = field_of(message, "chat_id")
        if channel is not None:
            fallback["channel"] = channel
        if chat_id is not None:
            fallback["chat_id"] = chat_id
        return [fallback]

    def get_channels(self, message_handler: MessageHandler) -> dict[str, Any]:
        channels: dict[str, Any] = {}
        for result in self._hook_runtime.call_many_sync("provide_channels", message_handler=message_handler):
            for channel in result:
                if getattr(channel, "name", None) not in channels:
                    channels[channel.name] = channel
        return channels

    @contextlib.asynccontextmanager
    async def running(self) -> AsyncGenerator[contextlib.AsyncExitStack, None]:
        async with contextlib.AsyncExitStack() as stack:
            for lifespan in self._hook_runtime.call_many_sync("provide_lifespan"):
                await maybe_context_manager(lifespan, stack)
            tape_store = self._hook_runtime.call_first_sync("provide_tape_store")
            self._tape_store = await maybe_context_manager(tape_store, stack)

            steering_inbox = self._hook_runtime.call_first_sync("provide_steering_inbox")
            self._steering_inbox = await maybe_context_manager(steering_inbox, stack)
            try:
                yield stack
            finally:
                self._tape_store = None
                self._steering_inbox = None
                await self._close_environments()

    async def get_environment(self, session_id: str) -> Environment | None:
        if session_id in self._environments:
            return self._environments[session_id]
        environment = await self._hook_runtime.call_first(
            "provide_environment", session_id=session_id, workspace=self.workspace
        )
        if (
            existing := self._environments.setdefault(session_id, environment)
        ) is not environment and environment is not None:
            await environment.close()
        return existing

    async def _close_environments(self) -> None:
        environments = [environment for environment in self._environments.values() if environment is not None]
        self._environments = {}
        for environment, result in zip(
            environments,
            await asyncio.gather(*(environment.close() for environment in environments), return_exceptions=True),
            strict=True,
        ):
            if isinstance(result, Exception):
                logger.warning(f"Failed to close environment {environment!r}: {result}")

    def get_tape_store(self) -> Any:
        return self._tape_store

    def get_tape_sidecars(self) -> tuple[Any, ...]:
        sidecars: dict[str, Any] = {}
        for sidecar in self._hook_runtime.call_many_sync("provide_tape_sidecar"):
            sidecars.setdefault(getattr(sidecar, "name", str(sidecar)), sidecar)
        return tuple(sidecars.values())

    def get_steering_inbox(self) -> Any:
        return self._steering_inbox

    def get_agent_hooks(self) -> AgentHooks:
        return self._agent_hooks

    def get_system_prompt(self, prompt: str | list[dict], state: dict[str, Any]) -> str:
        return "\n\n".join(
            result
            for result in reversed(self._hook_runtime.call_many_sync("system_prompt", prompt=prompt, state=state))
            if result
        )

    def build_tape_context(self) -> TapeContext:
        context = self._hook_runtime.call_first_sync("build_tape_context")
        return context

    def collect_onboard_config(self, plugin_name: str | None = None) -> dict[str, Any]:
        current_config = configure.get_config_data()
        implementations = list(self._hook_runtime._iter_hookimpls("onboard_config"))
        if plugin_name is not None:
            selected = [impl for impl in implementations if impl.plugin_name == plugin_name]
            if not selected:
                available = ", ".join(sorted({impl.plugin_name for impl in implementations})) or "(none)"
                raise ValueError(
                    f"No onboard_config hook found for plugin '{plugin_name}'. Available plugins: {available}"
                )
            implementations = selected

        for impl in reversed(implementations):
            result = self._hook_runtime._invoke_impl_sync(
                hook_name="onboard_config",
                impl=impl,
                call_kwargs={"current_config": current_config},
                kwargs={"current_config": current_config},
            )
            if result is _SKIP_VALUE or result is None:
                continue
            if not isinstance(result, dict):
                raise TypeError("hook.onboard_config must return dict or None")
            configure.merge(current_config, result)
        return configure.validate(current_config)
