# Host processes and the shell

This package **wraps child processes** you start from a terminal: it injects one pool entry at a time and can retry on recoverable child output (see the classifier in the source tree).

**Other software** in your editor or assistant that calls remote HTTP APIs **directly** (not by spawning your local `multiauth run` or a PATH shim) uses **its own** configuration. Those code paths are outside this package. To change behavior there, use that product’s own settings or environment for its process.

**Summary**

| Path | Role |
|------|------|
| `multiauth run` / PATH shim | Pool + retry for **spawned** CLIs described in your profile file |
| Built-in tools in an IDE | Configured in the IDE / extension, not by this repo |
