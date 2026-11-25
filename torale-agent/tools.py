"""Agent tool definitions: search, memory, fetch, and activity extraction."""

import asyncio
import json
import socket
from ipaddress import ip_address
from urllib.parse import urlparse

import httpx
import logfire
import parallel
import perplexity
from mem0.exceptions import MemoryError as Mem0Error
from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import ModelResponse, ToolCallPart

from models import (
    ActivityStep,
    Clients,
    FetchResult,
    MonitoringDeps,
    MonitoringResponse,
    ParallelSearchResult,
    PerplexitySearchResult,
    ToolError,
    TwitterSearchResult,
)

_NO_CLIENTS = json.dumps({"error": "No context available"})
_NO_CLIENTS_ERROR = ToolError(error="No context available")


SEARCH_FALLBACK_HINT = "Use another search tool."
MEMORY_FALLBACK_HINT = "Carry on without memory."


def _provider_error(
    provider: str, e: Exception, hint: str = SEARCH_FALLBACK_HINT
) -> ToolError:
    """Report an external provider failure to the model instead of failing the run.

    A provider outage or exhausted quota should cost one tool call, not the
    whole watch execution; the model carries on with what is still available.
    """
    response = getattr(e, "response", None)
    status = getattr(e, "status_code", None) or getattr(response, "status_code", None)
    detail = f"HTTP {status}" if status else type(e).__name__
    # Stable span name so exhausted credits stay visible in Logfire even though
    # the run itself now succeeds.
    logfire.warn(
        "provider unavailable: {provider} {detail}",
        provider=provider,
        detail=detail,
        # Perplexity says insufficient_quota, mem0's plan limit reports quota_limit.
        billing="quota" in str(e) or status == 402,
    )
    return ToolError(error=f"{provider} is unavailable ({detail}). {hint}")


def _get_clients(ctx: RunContext[MonitoringDeps]) -> Clients | None:
    """Extract clients from context, returning None if unavailable."""
    return ctx.deps.clients if ctx.deps else None


PARALLEL_SEARCH_MAX_RESULTS = 10
PARALLEL_SEARCH_MAX_CHARS = 5000
PARALLEL_SEARCH_BETAS = ["search-extract-2025-10-10"]
PARALLEL_SEARCH_MAX_EXCERPTS = 2

FETCH_MAX_CHARS = 5000
FETCH_TIMEOUT = 15.0

TWITTER_SEARCH_MAX_RESULTS = 10

# mem0 search hits also carry ids, scores and categories the model never uses.
MEMORY_FIELDS = ("memory", "created_at", "updated_at")

_TOOL_INPUT_KEYS: dict[str, str] = {
    "perplexity_search": "query",
    "parallel_search": "query",
    "twitter_search": "query",
    "fetch_url": "url",
    "search_memories": "query",
    "add_memory": "text",
    # MCP tools — Notion
    "NOTION_SEARCH_NOTION_PAGE": "query",
    "NOTION_FETCH_DATA": "pageId",
    # MCP tools — Linear
    "LINEAR_GET_ALL_LINEAR_TEAMS": "",
    "LINEAR_GET_CYCLES_BY_TEAM_ID": "teamId",
    "LINEAR_GET_CURRENT_USER": "",
    # MCP tools — GitHub
    "GITHUB_SEARCH_ISSUES_AND_PULL_REQUESTS": "query",
    "GITHUB_LIST_REPOSITORY_ISSUES": "owner",
    "GITHUB_GET_A_PULL_REQUEST": "pullNumber",
}

_MCP_TOOL_PREFIX_TO_SLUG: dict[str, str] = {
    "NOTION_": "notion",
    "LINEAR_": "linear",
    "GITHUB_": "github",
}


def _connector_slug_from_tool(tool: str) -> str | None:
    for prefix, slug in _MCP_TOOL_PREFIX_TO_SLUG.items():
        if tool.startswith(prefix):
            return slug
    return None


async def _is_safe_url(url: str) -> bool:
    """Check that a URL doesn't resolve to internal/private network resources."""
    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname or parsed.scheme not in ("http", "https"):
        return False

    try:
        loop = asyncio.get_running_loop()
        addrinfo = await loop.getaddrinfo(hostname, None, family=socket.AF_UNSPEC)
        return all(ip_address(addr[4][0]).is_global for addr in addrinfo)
    except (socket.gaierror, ValueError):
        return False


async def _fetch_and_extract(url: str) -> FetchResult:
    """Fetch a URL using Lightpanda headless browser and return content as markdown."""
    if not await _is_safe_url(url):
        return FetchResult(url=url, error="URL blocked: private or internal address")

    proc = await asyncio.create_subprocess_exec(
        "lightpanda",
        "fetch",
        "--dump",
        "markdown",
        "--strip_mode",
        "js,css",
        "--http_timeout",
        str(int(FETCH_TIMEOUT * 1000)),
        url,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=FETCH_TIMEOUT + 5
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return FetchResult(url=url, error="Fetch timed out")

    if proc.returncode != 0:
        error_msg = (
            stderr.decode().strip() if stderr else f"Exit code {proc.returncode}"
        )
        return FetchResult(url=url, error=error_msg)

    content = stdout.decode()
    content = "\n".join(line for line in content.splitlines() if line.strip())

    full_length = len(content)
    truncated = full_length > FETCH_MAX_CHARS

    return FetchResult(
        url=url,
        content=content[:FETCH_MAX_CHARS],
        content_length=full_length,
        truncated=truncated,
    )


def register_tools(agent: Agent[MonitoringDeps, MonitoringResponse]) -> None:
    """Attach monitoring tools (search_memories, add_memory, perplexity_search, parallel_search, fetch_url) to an agent."""

    @agent.tool
    async def search_memories(
        ctx: RunContext[MonitoringDeps], query: str
    ) -> str | ToolError:
        """Search previous monitoring memories for this task. Use to recall what was found in earlier runs."""
        if (clients := _get_clients(ctx)) is None:
            return _NO_CLIENTS
        try:
            results = await clients.mem0.search(
                query,
                filters={
                    "AND": [
                        {"user_id": ctx.deps.user_id},
                        {"app_id": ctx.deps.task_id},
                    ]
                },
                top_k=10,
            )
        except Mem0Error as e:
            return _provider_error("Memory search", e, MEMORY_FALLBACK_HINT)
        hits = results.get("results", []) if isinstance(results, dict) else results
        memories = [{k: hit.get(k) for k in MEMORY_FIELDS} for hit in hits]
        return json.dumps(memories, default=str)

    @agent.tool
    async def add_memory(ctx: RunContext[MonitoringDeps], text: str) -> str | ToolError:
        """Store a new meta-knowledge memory for this task. Only store patterns and source insights, not individual check results."""
        if (clients := _get_clients(ctx)) is None:
            return _NO_CLIENTS
        try:
            result = await clients.mem0.add(
                [{"role": "user", "content": text}],
                user_id=ctx.deps.user_id,
                app_id=ctx.deps.task_id,
            )
        except Mem0Error as e:
            return _provider_error("Memory storage", e, MEMORY_FALLBACK_HINT)
        return json.dumps(result, default=str)

    @agent.tool(include_return_schema=True)
    async def perplexity_search(
        ctx: RunContext[MonitoringDeps], query: str
    ) -> list[PerplexitySearchResult] | ToolError:
        """Search the web using Perplexity for current information. Include the current year in queries for time-sensitive topics."""
        if (clients := _get_clients(ctx)) is None:
            return _NO_CLIENTS_ERROR
        try:
            response = await clients.perplexity.search.create(query=query)
        except perplexity.APIError as e:
            return _provider_error("Perplexity search", e)
        return [
            PerplexitySearchResult(
                title=r.title,
                url=r.url,
                snippet=r.snippet,
                date=r.date,
                last_updated=r.last_updated,
            )
            for r in response.results
        ]

    @agent.tool(include_return_schema=True)
    async def parallel_search(
        ctx: RunContext[MonitoringDeps], query: str
    ) -> list[ParallelSearchResult] | ToolError:
        """Search the web using Parallel for current information. Returns structured results with URLs, titles, and content excerpts. Often finds different authoritative sources than Perplexity."""
        if (clients := _get_clients(ctx)) is None:
            return _NO_CLIENTS_ERROR
        try:
            result = await clients.parallel.beta.search(
                objective=query,
                search_queries=[query],
                max_results=PARALLEL_SEARCH_MAX_RESULTS,
                max_chars_per_result=PARALLEL_SEARCH_MAX_CHARS,
                betas=PARALLEL_SEARCH_BETAS,
            )
        except parallel.APIError as e:
            return _provider_error("Parallel search", e)
        return [
            ParallelSearchResult(
                title=r.title or r.url,
                url=r.url,
                excerpts=r.excerpts[:PARALLEL_SEARCH_MAX_EXCERPTS]
                if r.excerpts
                else [],
            )
            for r in (result.results or [])
        ]

    @agent.tool(include_return_schema=True)
    async def twitter_search(
        ctx: RunContext[MonitoringDeps], query: str
    ) -> list[TwitterSearchResult] | ToolError:
        """Search Twitter/X for recent tweets. Best for real-time public reactions, social sentiment, and announcements posted on Twitter. Uses Twitter's advanced search syntax (e.g. 'from:user', 'min_faves:10')."""
        if (clients := _get_clients(ctx)) is None:
            return _NO_CLIENTS_ERROR
        try:
            resp = await clients.twitter.get(
                "/twitter/tweet/advanced_search",
                params={"query": query, "queryType": "Latest"},
            )
            resp.raise_for_status()
            tweets = resp.json().get("tweets", [])
        except httpx.HTTPError as e:
            return _provider_error("Twitter search", e)
        except json.JSONDecodeError:
            return ToolError(error="Failed to decode response from Twitter API")
        return [
            TwitterSearchResult(
                text=t.get("text", ""),
                author=t.get("author", {}).get("userName", ""),
                url=t.get("url", ""),
                likes=t.get("likeCount", 0),
                retweets=t.get("retweetCount", 0),
                created_at=t.get("createdAt", ""),
            )
            for t in tweets[:TWITTER_SEARCH_MAX_RESULTS]
        ]

    @agent.tool_plain(include_return_schema=True)
    async def fetch_url(url: str) -> FetchResult:
        """Fetch a URL directly and extract its content as markdown. Uses a headless browser, so JS-rendered pages work. Useful when search snippets are stale or you need to check the source."""
        try:
            return await _fetch_and_extract(url)
        except Exception as e:
            return FetchResult(url=url, error=str(e))


def extract_activity(messages: list) -> list[ActivityStep]:
    """Extract tool call activity from Pydantic AI message history."""
    steps: list[ActivityStep] = []
    for msg in messages:
        if not isinstance(msg, ModelResponse):
            continue
        for part in msg.parts:
            if not isinstance(part, ToolCallPart):
                continue
            tool = part.tool_name
            args = part.args if isinstance(part.args, dict) else {}
            key = _TOOL_INPUT_KEYS.get(tool, "")
            input_val = args.get(key, "") if key else ""
            steps.append(
                ActivityStep(
                    tool=tool,
                    detail=input_val,
                    connector_slug=_connector_slug_from_tool(tool),
                )
            )
    return steps
