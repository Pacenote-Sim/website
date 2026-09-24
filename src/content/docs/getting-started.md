---
title: Getting started
description: Run a Pacenote server for your team, build a client for your drivers, and pair the first one.
order: 1
---

## What you need

- **PostgreSQL 15 or newer**, and an empty database on it. The user the server connects as needs permission to create tables.
- **A host name** pointing at the machine, not an IP address. An address cannot get a certificate, and it pins every client you build to one machine.
- Nothing else. No runtime, no package manager, no container unless you want one.

## Run the server

Download the zip for your platform from the [releases page](https://github.com/Pacenote-Sim/server/releases), unzip it and run it:

```bash
./pacenote-server
```

On the first run it prints a token and waits:

```text
Pacenote v1.0.0 — first run
Open  http://your-server:8080/setup
Token 7QK4-M2XF-8DNA-0123-4567-89AB-CDEF-GHJK        (this terminal only, once)
```

Open that address, type the token, and the wizard asks four things:

1. **Your database.** A connection string, tested before you move on. A failure says which one it was: unreachable, wrong credentials, no such database, or a server too old.
2. **Your organisation name.** What drivers see when their client connects.
3. **An administrator account.** An email address and a password. Drivers do not get one; their machines are paired instead.
4. **Your public address.** The host name clients reach, and whether this server sits behind your own proxy or gets a certificate for itself.

Then it builds the schema, writes its configuration and starts serving. Nothing needs restarting.

The token exists because until there is an administrator account, whoever loads the page first would become one. It is printed to the terminal, never logged, good once, and minted afresh on every start.

> Setup runs once. Deleting the data directory does not bring the wizard back: a row in your database records that setup finished, written in the same transaction that created your administrator. In a container on an ephemeral volume, pass `PACENOTE_DATABASE_URL` in the environment instead. See [Configuration](/docs/configuration/).

## Install a plugin

Anything that calls a third party is a plugin. The server names no vendor and holds no credential for one.

Build the plugin, put its binary and `plugin.json` (and its `migrations/` folder if it has one) in a folder named after the plugin under `<data>/plugins/`, then press **Look for new plugins** in the panel. The folder's name and the name in the manifest have to match.

For [engineer](https://github.com/Pacenote-Sim/engineer), the coaching plugin:

```bash
git clone https://github.com/Pacenote-Sim/engineer
cd engineer
go build -o engineer ./cmd/engineer
mkdir -p /path/to/pacenote-data/plugins/engineer
cp engineer plugin.json /path/to/pacenote-data/plugins/engineer/
cp -r migrations /path/to/pacenote-data/plugins/engineer/
```

The panel lists what the plugin declared, renders the settings it asked for, tells you which hosts it calls, and caps what it may spend per day.

## Build a client

A driver runs one executable beside the simulator. The team's server builds it: the operator picks the plugins, the server compiles them into one `pacenote.exe` with its own address stamped inside, and a driver installs that one file.

Until your server builds clients for you, build one by hand. You need Go 1.26 or newer. No C toolchain and no Windows machine are needed: the window, the audio and the shared-memory readers are all plain Go.

Write a `main` package that imports the plugins you want:

```bash
mkdir my-client && cd my-client
cat > go.mod <<'GOMOD'
module my-client

go 1.26
GOMOD
cat > main.go <<'GOMAIN'
package main

import (
	"os"

	"github.com/pacenote-sim/client/app"

	_ "github.com/pacenote-sim/client-iracing"
	_ "github.com/pacenote-sim/client-engineer"
	_ "github.com/pacenote-sim/client-visual-telemetry"
	_ "github.com/pacenote-sim/client-voice"
)

func main() { os.Exit(app.Main(os.Args[1:], os.Stdout, os.Stderr)) }
GOMAIN
go mod tidy
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -tags wails \
  -ldflags "-s -w -H windowsgui" -o pacenote.exe .
```

Drop the `wails` tag and the `-H windowsgui` flag for a headless build. A client built without a source plugin reads no simulator: it has the demo circuit and a recording and nothing else.

A companion's server half has to be installed on the server as well, or the companion never starts. A plugin is two halves that find each other.

## Pair a driver

Run the client and point it at your server:

```bash
pacenote --server https://your.server
```

Not yet paired, it shows a code. An administrator enters that code in the server's panel against the driver's name, and the client is paired. From then on the client starts, finds the simulator, and uploads laps as they are driven. Closing it finishes the job: the stint is ended, the queue gets its last try, and what will not go in ten seconds stays on disk for next time.

Without a simulator, try the demo circuit:

```bash
pacenote --server https://your.server --demo --speed 30 --laps 2
```

## Where to next

- [Configuration](/docs/configuration/): every environment variable, the two ports, logs.
- [Writing a plugin](/docs/writing-a-plugin/): a server plugin in twenty lines, a client source or companion.
- [Architecture](/docs/architecture/): the components, the repositories and the wire.
