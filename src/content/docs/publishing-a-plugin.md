---
title: Publishing a plugin
description: How a plugin gets into the marketplace, what the checks look for, and what approval means.
order: 5
---

The marketplace is an index of approved plugins, kept in the public repository
[Pacenote-Sim/marketplace](https://github.com/Pacenote-Sim/marketplace). A plugin is listed when a pull
request adding its manifest is merged. One flow for every plugin: server or client, open or closed, free
or paid.

## In short

1. Tag a release of your plugin and make sure it builds with `CGO_ENABLED=0` for Linux, macOS and
   Windows. A plugin that needs cgo is not eligible.
2. Write `plugins/<name>.yaml` in a fork of the marketplace repository and run the checks yourself:
   `go run ./cmd/marketplace check --dir /path/to/your/checkout plugins/<name>.yaml`.
3. Open the pull request. The checks run again on your tag; a reviewer reads the code and writes a
   paragraph; merge is approval.

The full instructions, the manifest fields and the checklist the reviewer uses are in the repository:
[SUBMITTING.md](https://github.com/Pacenote-Sim/marketplace/blob/main/SUBMITTING.md) and
[REVIEW.md](https://github.com/Pacenote-Sim/marketplace/blob/main/REVIEW.md).

## What the checks do

| Check | Fails when |
|---|---|
| licence | there is no `LICENSE` file at the module root |
| manifest | your `plugin.json` or `client-plugin.json` disagrees with the marketplace manifest, or the interface version is one no current host accepts |
| imports | a client plugin imports outside the [policy](https://github.com/Pacenote-Sim/marketplace/blob/main/policy/imports.yaml) without a reason |
| symbols | a client plugin uses anything that dials, listens or runs a process |
| hosts | a string literal names a host that is not declared under `calls` |
| build | it does not build for a platform in the policy, `go vet` complains, or `go mod tidy` would change something |
| reproducible | a server plugin builds different bytes twice |
| vuln | `govulncheck` reports a vulnerability that is reached |

## What approval means

A person read the code, or the diff since the last approved version, against a public checklist: it does
what its summary says, it sends data only through declared doors, it touches nothing it was not lent, and
it keeps nothing about the driver it does not need.

After the merge, Pacenote's CI builds server-plugin packages from the approved tag and attaches them to a
release on the marketplace repository; the index carries their checksums. Client plugins are compiled by
each team's server from the module proxy at the approved tag. The index itself is signed, and a server
verifies the signature before it acts on anything in it.

## Private plugins

Keep your repository private if you like. Add the GitHub user `pacenote-review` as a read-only
collaborator, set `visibility: private` in the manifest, and the checks and the reviewer read the code
through that account. Pacenote's build service compiles and signs exes that contain private plugins; a
community server builds from public modules only, because a Go module needs source to compile.

## Money

Registration, activation and payment are yours entirely, by key, by URL or however you like. The
marketplace lists your plugin and serves its package; it checks no licence and takes no cut. Set
`pricing: paid` in the manifest so an operator knows before installing.

## Withdrawing

Set a version's `status` to `withdrawn` in a pull request and say why. Servers warn about installed
copies, refuse new installs and builds with it, and the build service stops signing exes that contain
it. The version stays in the index as a record.
