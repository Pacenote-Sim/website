---
title: Writing a plugin
description: A server plugin in twenty lines, a client source or companion, and how to test and license them.
order: 3
---

Pacenote has two plugin contracts, each a Go module of interfaces and types with no implementation in it:

| Contract | Runs | Licence |
|---|---|---|
| [plugin](https://github.com/Pacenote-Sim/plugin) | on the server, as a separate process | Apache-2.0 |
| [clientplugin](https://github.com/Pacenote-Sim/clientplugin) | inside the client, compiled in | Apache-2.0 |

Their module paths are `github.com/pacenote-sim/plugin` and `github.com/pacenote-sim/clientplugin`.

A plugin depends on the contract and never on the server or the client. Because the contracts are Apache-2.0, you may license your plugin however you like, including closed. The client, the protocol module and the official client plugins are GPL-3 with the [Pacenote Plugin Exception](https://github.com/Pacenote-Sim/client/blob/main/LICENSE-EXCEPTION), which says a plugin written against a contract is not a work based on them, and that a client compiled with your plugin may be distributed under your plugin's terms. The client's own part stays GPL either way.

## A server plugin

A server plugin is a program. The server starts it and talks to it over a local socket; one that crashes does not take the server with it.

```go
package main

import (
	"context"

	"github.com/pacenote-sim/plugin"
)

type mine struct{}

func (mine) Settings(context.Context) ([]plugin.Setting, error) { return nil, nil }
func (mine) Notify(context.Context, plugin.Event) (plugin.Usage, error) { return plugin.Usage{}, nil }

func main() { plugin.Serve(mine{}) }
```

Put a `plugin.json` beside the binary, in a directory named after the plugin, under the server's `<data>/plugins/`. The manifest, the rules and a complete worked example are the package documentation: `go doc github.com/pacenote-sim/plugin`. The `examples/testplugin` directory exercises every part of the contract and does nothing else. Read it first.

### What a server plugin can do

| | |
|---|---|
| **Be told something happened** | `lap.completed`, `stint.finished`. Derived facts, never raw traces. Fire and forget. |
| **Ask another plugin** | Through the server, which checks your manifest allows it and carries the answer back. |
| **Be asked by another plugin** | Kinds you declare, spelled `<your name>.<what>`, with a deadline the server means. |
| **Be lent a credential** | For one call. The server holds it; you never store one. |
| **Report what a call did** | The job, whether it came from cache, any tokens spent. The server enforces the daily cap. |
| **Declare your settings** | The panel renders them. |
| **Keep tables of your own** | Your own PostgreSQL role and schema, your own migrations, dropped when you are uninstalled. |
| **Serve your own pages** | At `/plugin/<your name>/`, with the host deciding who may reach each one. |
| **Say what you call** | `"network": true` and `"calls": ["api.example.com"]`, shown to the operator before they enable you. |

### Serving pages

Every address is declared in the manifest, and the declaration is what the host enforces:

```json
{
  "capabilities": {
    "http": {
      "title": "Payments",
      "routes": [
        { "path": "/webhook", "access": "public" },
        { "path": "/",        "access": "admin"  }
      ]
    }
  }
}
```

| Access | Who reaches it |
|---|---|
| `public` | Anyone. A webhook, a page with no session behind it. |
| `driver` | A driver of this team, signed in in a browser or the telemetry client with its device token. You are told which; you never see the credential. |
| `admin` | An administrator of this server. |
| `custom` | You check it yourself, and say why in `reason`. |

An address no route covers never reaches the plugin. The host does not pass on its own cookies, does not tell you who the caller is from anything the browser sent, and caps both the request and the response.

### Asking another plugin

Plugins talk to each other through the server, never directly:

```json
{ "name": "drivers",  "capabilities": { "requests": ["drivers.lookup"] } }
{ "name": "payments", "capabilities": { "asks": ["drivers"] } }
```

The asker implements `Asker` and calls `host.Ask(ctx, "drivers.lookup", payload)`. The server stamps who asked, checks both manifests, charges the answering plugin's daily cap, applies the deadline, and does not read the payload. A question may pass through at most three plugins, so two that ask each other stop rather than loop.

### Versioning and transport

`plugin.InterfaceVersion` is the contract's version. The host declares it, the plugin declares in its manifest the one it was built against, and they must match exactly. A mismatch refuses to start with a message naming both versions.

The transport is gRPC over a local socket via `hashicorp/go-plugin`, with JSON message bodies. Both `proto/plugin.proto` and the Go types are published, so a plugin in another language has everything it needs. Credentials travel in their own field, never inside a JSON body, so a plugin that logs the request it was given cannot leak an operator's key.

## A client plugin

Go has no run-time plugins on Windows, so a client plugin is a Go module whose package registers itself when imported. The team's server generates a `main` that imports the app and every plugin the operator chose, and compiles it into one executable.

There are two kinds.

### A source

A source reads one simulator and produces a `Sample` at the simulator's own rate. One source runs at a time, the one whose simulator is running, so a client may hold several.

```go
package iracing

func init() { clientplugin.RegisterSource(&source{}) }

type source struct{ /* … */ }

func (*source) Name() string                                            { return "iracing" }
func (*source) Running() bool                                           { /* the shared memory exists */ }
func (s *source) Open(ctx context.Context) error                        { /* attach */ }
func (s *source) Read(ctx context.Context) (clientplugin.Sample, error) { /* the next reading */ }
func (s *source) Close() error                                          { /* detach */ }
```

Copy `examples/source-demo` from the contract repository: it drives a made-up 3 km lap at 20 Hz for a machine with no simulator. Replace `Running`, `Open`, `Read` and `Close` with the simulator's memory or socket.

### A companion

A companion is the client half of a server plugin. The app starts it when `GET /me` lists a running server plugin of the same name, delivers the events it asked for, and stops it when the plugin disappears.

```go
package engineer

func init() { clientplugin.RegisterCompanion(&companion{}) }

func (*companion) Name() string { return "engineer" }
func (*companion) Wants() []clientplugin.EventKind {
	return []clientplugin.EventKind{clientplugin.KindLapLastCorner, clientplugin.KindCornerApproaching}
}
func (c *companion) Notify(ctx context.Context, e clientplugin.Event) error {
	switch e := e.(type) {
	case *clientplugin.LapLastCorner:
		// post the lap to /laps through c.host.Do, keep the lines that come back
	case *clientplugin.CornerApproaching:
		// c.host.Play the line for e.Turn
	}
	return nil
}
```

Through its `Host` a companion can reach exactly its own plugin's routes with the driver's token, play audio, speak words, show a page, set its status line, log, and keep its own settings. Nothing else: there is no way to the driver's disk, to another plugin, or to any other server.

Copy `examples/companion-echo`: it posts each lap's time to its server plugin's `/laps`, shows the answers on its page, and says each corner's number.

### The events

In the order a stint produces them: `stint.started`, `sampled`, `corner.passed`, `lap.last-corner`, `lap.completed`, `corner.approaching`, `stint.finished`, `server.changed`. Each has a type; a companion switches on the type.

`lap.last-corner` is raised when every corner of the lap is measured and the straight to the line remains. That is the moment to post a lap, so the straight pays for the answer.

### The manifest

Every client plugin module carries `client-plugin.json` at its root. The server reads it from the module proxy to draw the build page; a module without it is refused.

```json
{"name": "engineer", "kind": "companion", "title": "Race engineer",
 "description": "Posts each lap to engineer and plays its lines.",
 "interface_version": 1, "server_plugin": "engineer"}
```

A source's `name` is the simulator; a companion's is its server plugin.

### Testing a client plugin

`clientplugintest` is the app for your tests. `NewHost` gives you a `Host` whose plugin routes are an `http.Handler` you write, recording everything the companion played, said, showed and requested. `Deliver` gives a companion events the way the app does. `Drain` opens a source, reads a number of samples and closes it.

```go
h := clientplugintest.NewHost(t, fakeRoutes)
c := mine.New()
require.NoError(t, c.Start(ctx, h))
require.NoError(t, clientplugintest.Deliver(ctx, c, &clientplugin.LapCompleted{Lap: 1, LapMs: 98765}))
require.Equal(t, "/laps", h.Requests()[0].Path)
```

The client plugin contract depends on the standard library and `github.com/pacenote-sim/protocol`, and nothing else. Lint enforces it.

## Two halves, one plugin

A feature that needs both sides, coaching for instance, is a server plugin and a companion with the same name. The server half receives events and serves routes under `/plugin/<name>/`; the companion posts to those routes and plays what comes back. [engineer](https://github.com/Pacenote-Sim/engineer) and [client-engineer](https://github.com/Pacenote-Sim/client-engineer) are the worked example.
