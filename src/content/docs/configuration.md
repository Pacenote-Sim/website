---
title: Configuration
description: The data directory, environment variables, the two ports, and what the server logs.
order: 2
---

## What sits beside the binary

```text
./pacenote-server                the binary
./pacenote-data/                 created when setup finishes, mode 0700
    config.json                  connection string, listen addresses, data key — mode 0600
    autocert/                    the certificate cache, if this server holds its own
    plugins/                     one directory per plugin
    client/                      the prebuilt Windows client, if you build clients here
```

Everything else is in PostgreSQL. Backup and restore are `pg_dump` and `pg_restore`.

`config.json` holds the data key that seals every credential in the database: a plugin's API key, the signing certificate. That is why a database dump carries nothing usable, and why losing the data directory means entering those again. The panel says so rather than letting a feature fail one call at a time.

## Environment variables

Every value in the configuration file can be overridden from the environment:

| Variable | What it is |
|---|---|
| `PACENOTE_DATA_DIR` | Where `config.json` lives. Default: `pacenote-data` beside the binary. |
| `PACENOTE_DATABASE_URL` | The PostgreSQL connection string. |
| `PACENOTE_LISTEN` | The public address. Default `:8080`. |
| `PACENOTE_METRICS_LISTEN` | The private address. Default `127.0.0.1:9090`, and it must stay on loopback. |
| `PACENOTE_SECRET_KEY` | The data key that opens stored credentials. |
| `PACENOTE_CLIENT_BINARY` | The prebuilt Windows client, if it is not in `<data>/client/`. |
| `PACENOTE_LOG_LEVEL` | `debug`, `info`, `warn` or `error`. |

Flags: `-data`, `-log-level`, `-version`.

### In a container

When the data directory is not durable, give the server the connection string in the environment:

```bash
PACENOTE_DATABASE_URL=postgres://pacenote:...@db:5432/pacenote ./pacenote-server
```

With no configuration file and no such variable, the server stops and says so rather than guessing. It will not run the wizard, because the database may already hold an administrator.

Each release also pushes a multi-architecture container image. The packaging tests check the compose file and the Dockerfile against what the zip contains, so the two cannot drift.

## The two ports

The **public** port serves drivers, plugins and the admin panel. Plugins' pages are mounted on it under `/plugin/<name>/`; there is no second listener for them.

The **private** port serves Prometheus metrics and pprof, and binds to loopback. The server refuses to start if you point it elsewhere, because that port publishes its internals.

## Logs

Structured JSON on stdout, one line per event, with a redaction layer in front. A token, an `Authorization` header, a connection string's password or an API key cannot reach a log line: the handler removes them rather than trusting every call site to remember.

Everything a plugin prints is echoed into the server's log as `plugin printed`, under the plugin's name and scrubbed of the credentials it was lent, beside the panel card that already showed it.

## Plugin settings and spend

Each plugin declares its settings in its manifest and the panel renders them, so an operator configures everything in one place. A credential is entered once, sealed by the server with the data key, and lent to the plugin one call at a time. The plugin never stores it.

A plugin that declares `"network": true` names the hosts it calls, and the panel shows them before you enable it. Each call the plugin makes reports what it did and any tokens it spent. The server records it and enforces the **daily cap** you set per plugin.

## Client configuration

The client has no settings of its own. What a plugin wants to keep between runs, a volume, a language, it keeps through the client, which stores it by plugin under the user's configuration directory and never reads it.

The client's data directory holds `config.json` (the device token), the `queue` of uploads the server has not accepted yet, `recordings`, and `pacenote.log`. `--data` moves it.

```bash
pacenote                                   # the stamped server, the compiled-in sources
pacenote --server http://localhost:8080    # a client not built by a server
pacenote --demo --speed 30 --laps 2        # the demo circuit, fast, two laps, then stop
pacenote --replay session.jsonl.gz         # a recording, at the pace it was driven
pacenote --record                          # write every session to the data directory
```

The iRacing source reads two more variables: `PACENOTE_IRACING_IBT` plays a telemetry file instead of the live game (with `PACENOTE_IRACING_SPEED` as a multiplier), and `PACENOTE_IRACING_RECORD` writes every live session to a directory in iRacing's own layout.
