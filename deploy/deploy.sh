#!/usr/bin/env sh
# Build the site and copy it to the server.
# Usage: deploy/deploy.sh user@host [/var/www/pacenote]
set -eu
cd "$(dirname "$0")/.."
target="${1:?usage: deploy/deploy.sh user@host [remote-dir]}"
dir="${2:-/var/www/pacenote}"
bun run build
# --no-perms keeps macOS's openrsync happy; permissions are set on the server afterwards.
rsync -rlz --delete --no-perms --no-owner --no-group dist/ "$target:$dir/"
ssh "$target" "chmod -R u=rwX,go=rX '$dir'"
echo "deployed to $target:$dir"
