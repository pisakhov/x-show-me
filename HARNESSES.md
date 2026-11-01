# Use Show Me with any agent

[Back to the README](README.md)

Show Me isn't tied to a framework. It needs three things:

1. **A rule.** The agent knows when to show. Use [`skills/show-me/SKILL.md`](skills/show-me/SKILL.md).
2. **A card.** The agent writes one HTML file.
3. **A host.** Something shows the card and passes a tap back as text.

## Terminal agents: Claude Code, Codex, Pi

Copy the [`skills/show-me`](skills/show-me) folder here:

| Agent | Folder |
|---|---|
| Claude Code | `.claude/skills/show-me/` or `~/.claude/skills/show-me/` |
| Codex | `.agents/skills/show-me/` or `~/.agents/skills/show-me/` |
| Pi | `~/.pi/agent/skills/show-me/` |

The agent runs the host itself. It needs Node 20 or newer:

```bash
node show-card.mjs card.html
```

A browser tab opens on this machine. The human taps and presses Send. The reply prints to stdout, so the agent reads it like any other command output. On a remote machine, forward the port it prints.

It waits up to 10 minutes, so give the command a long timeout or run it in the background.

`show-card.mjs` and `compare-card.mjs` need nothing else. `verify-card.mjs` also needs Playwright, so run `npm install playwright` in that folder.

## Google ADK

The instruction teaches the rule. A tool delivers the card.

```python
from pathlib import Path

from google.adk.agents import LlmAgent
from google.adk.tools import ToolContext
from google.genai import types

async def show_card(name: str, html: str, tool_context: ToolContext) -> dict:
    """Show the human an interactive HTML card."""
    card = types.Part.from_bytes(data=html.encode(), mime_type="text/html")
    version = await tool_context.save_artifact(filename=f"{name}.html", artifact=card)
    return {"card": f"{name}.html", "version": version}

agent = LlmAgent(
    name="helper",
    model="YOUR_MODEL",
    instruction=Path("skills/show-me/SKILL.md").read_text(),
    tools=[show_card],
)
```

Give your `Runner` an artifact service, such as `InMemoryArtifactService`. Then render the saved card in your app with the [web host](#your-own-web-app) below.

## LangChain

```python
from pathlib import Path

from langchain.agents import create_agent
from langchain.tools import tool

@tool
def show_card(name: str, html: str) -> str:
    """Show the human an interactive HTML card."""
    save_card(name, html)  # Your storage.
    return f"card:{name}.html"

agent = create_agent(
    model="YOUR_MODEL",
    tools=[show_card],
    system_prompt=Path("skills/show-me/SKILL.md").read_text(),
)
```

When your app sees the `card:` result, render it with the [web host](#your-own-web-app) below.

Already using LangGraph generative UI? `push_ui_message` follows the same principles with your own React components.

## Your own web app

This is the whole host. Serve cards from a separate origin if you can.

```html
<iframe id="card" sandbox="allow-scripts" srcdoc="…the card…"></iframe>
<script>
  const card = document.getElementById('card');
  addEventListener('message', event => {
    if (event.source !== card.contentWindow) return;
    if (event.data?.type !== 'x-card-reply') return;
    composer.value = String(event.data.text).slice(0, 2000); // Fill the draft. Never send.
  });
</script>
```

Let the card sit on your page, not in a box. Give the frame no background and no border, and let the card's own `color-scheme` match your page:

```css
#card { display: block; width: 100%; border: 0; border-radius: 14px; background: transparent; }
```

For full screen, one quiet icon in the card's corner opens a viewer that fills the viewport on every device: `position: fixed; inset: 0; overflow: hidden`, an icon-only toolbar (zoom, point, open in a tab, close) so it can never grow wider than a phone screen, and the same frame inside.

Keep `sandbox="allow-scripts"` and don't add `allow-same-origin`. A card is code written by a model, so treat it like code from a stranger.

A motion clip is a normal card with the MP4 inside it, so this host already plays it. If you set a Content Security Policy, allow `media-src data:`.

## MCP Apps

[MCP Apps](https://github.com/modelcontextprotocol/ext-apps) bring cards to any host that supports the standard. A tool links to a `ui://` resource with the type `text/html;profile=mcp-app`, and the host renders it in a sandboxed frame.

The principles and the card design carry over. Replies are different: use the host's MCP Apps messages instead of `x-card-reply`.
