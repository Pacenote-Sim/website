---
title: Architecture
description: The components, the repositories, the wire protocol and the plugin transport.
order: 4
---

## The components

```text
 simulator ──► client ──────────────► server ──► server plugins
                 ▲                      │   ▲          │
                 │ companions           │   └──────────┘
                 └──── audio, pages ────┘     events, asks, routes
```

**The client** is the program a driver runs beside the simulator. A source plugin reads the game and produces samples. The client turns samples into laps and corners, each measured, and sends them to the team's server. It runs the companions of the server's plugins and routes their audio to the one that plays. It is one executable; what is in it was chosen when it was built.

**The server** is one binary a team runs, with a PostgreSQL database. Drivers' machines are paired to it and upload stints, laps and traces. An administrator sets it up in a browser, installs plugins and configures them in a panel. Everything it stores lives in the database; the data directory holds only configuration, the key that seals credentials, and the plugins.

**Server plugins** are separate processes the server starts. They are told when a lap or stint finishes, may be asked questions with a deadline, keep their own tables, serve their own pages, and are lent credentials one call at a time. One that crashes does not take the server with it.

**Companions** are the client halves of server plugins, compiled into the client. A companion posts to its own plugin's routes with the driver's token and plays what comes back.

## The repositories

| Repository | What it is | Licence |
|---|---|---|
| [server](https://github.com/Pacenote-Sim/server) | The server. One binary, PostgreSQL, the panel, the plugin host. | GPL-3.0-or-later |
| [client](https://github.com/Pacenote-Sim/client) | The client as a package, plus a build with no plugins. | GPL-3.0-or-later with the Plugin Exception |
| [protocol](https://github.com/Pacenote-Sim/protocol) | The wire between client and server: v1 types and the lap-trace codec. | GPL-3.0-or-later with the Plugin Exception |
| [plugin](https://github.com/Pacenote-Sim/plugin) | The server plugin contract. Interfaces, manifest, proto file. | Apache-2.0 |
| [clientplugin](https://github.com/Pacenote-Sim/clientplugin) | The client plugin contract: source, companion, host, events. | Apache-2.0 |
| [engineer](https://github.com/Pacenote-Sim/engineer) | Server plugin: coaching cues, radio, debrief, setup changes. | GPL-3.0 |
| [client-iracing](https://github.com/Pacenote-Sim/client-iracing) | Source: reads iRacing's shared memory in Go with no C. | GPL-3.0 with the Plugin Exception |
| [client-engineer](https://github.com/Pacenote-Sim/client-engineer) | Companion of engineer. | GPL-3.0 with the Plugin Exception |
| [client-voice](https://github.com/Pacenote-Sim/client-voice) | Companion of voice; the one plugin that makes sound. | GPL-3.0 with the Plugin Exception |
| [client-visual-telemetry](https://github.com/Pacenote-Sim/client-visual-telemetry) | Companion of visual-telemetry. | GPL-3.0 with the Plugin Exception |

The client and the server are built in two repositories by people who cannot see each other's code. Everything they agree on is in `protocol`, and nothing else: no HTTP, no database, no business rule.

## The wire protocol

`protocol/wire` holds the v1 request and response types with the JSON tags the API is defined in. `protocol/trace` is the lap-trace codec: structure of arrays, zig-zag delta, varint, zstd.

A blob carries its codec version in its first byte, outside the compressed frame, so a server can migrate a table having read one byte of each row. Changing the wire format means bumping the codec version and regenerating the golden vectors, in that order. The client asserts that it produces those bytes; the server asserts that it reads them; neither has to trust the other's tests.

| Path | Budget |
|---|---|
| Encode, 300 samples | under 40 µs, 1 alloc/op |
| Decode, 300 samples | under 20 µs, 0 allocs/op, into a reused buffer |

`Encode` validates before it writes and `Decode` validates again on the way out, so a truncated, corrupt or hostile blob returns an error, never a panic.

## What the client measures

The client interpolates lap times at the line crossing, keeps the trace at full rate, resamples by distance for the wire, and measures every corner of a lap as it is driven: where braking started, the speed at the apex and the exit, how long the throttle waited, the gear. A corner is what this lap did and nothing compared; comparison is a server plugin's job.

Writes the server has not accepted yet are queued on disk, in order, and drained when it is back. Closing the client ends the stint, gives the queue a last try, and waits for a companion still uploading a lap.

## The plugin transport

**Server plugins** talk to the server over gRPC on a local socket, via `hashicorp/go-plugin`. Message bodies are JSON documents rather than protobuf messages, because the product already speaks JSON between client and server and two schemas drift. Credentials travel in their own field, never inside a JSON body.

Plugins ask each other only through the server, which stamps who asked, checks both manifests, charges the answering plugin's daily cap, applies the deadline, and does not read the payload. A question may pass through at most three plugins.

A plugin's pages are mounted at `/plugin/<name>/` on the server's own public port. Every route is declared in the manifest with an access level, and the host enforces the declaration: an address no route covers never reaches the plugin.

**Client plugins** are compiled in, because Go has no run-time plugins on Windows. A companion sees the app only through its `Host`: its own plugin's routes with the driver's token, audio, a page, a status line, a log, and its own settings.

## Pairing and credentials

Drivers do not have accounts. A client shows a code; an administrator enters it in the panel; the client receives a device token and uploads with it. The token identifies the driver on the API and on `/plugin/<name>/…`, but the token itself is never forwarded to a plugin: the host tells the plugin which driver is calling and keeps the credential.

A plugin's API key is entered once in the panel, sealed with the server's data key, stored in the database, and lent to the plugin for one call at a time. The plugin never stores it. A redaction layer in front of the log removes tokens, `Authorization` headers, connection-string passwords and API keys before they reach a line.

## Ports

| Port | Default | Serves |
|---|---|---|
| Public | `:8080` | Drivers, plugins' routes, the admin panel. |
| Private | `127.0.0.1:9090` | Prometheus metrics and pprof. Must stay on loopback; the server refuses to start otherwise. |

## Building

Everything is Go 1.26 or newer with `CGO_ENABLED=0`. The server cross-compiles to Linux, macOS and Windows on amd64 and arm64 as one static file per platform. The client cross-compiles to a Windows executable from any machine: the window (Wails 3), the audio and the shared-memory readers are plain Go, which is what lets a server build a driver's exe.
