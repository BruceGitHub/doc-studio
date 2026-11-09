#!/bin/sh
# Doc Studio container entrypoint.
#
# By default the container is sealed: all outbound traffic is rejected except
# loopback and replies to connections that were opened from outside (the host
# reaching the published port). The server itself never needs the internet.
#
# Set DOCSTUDIO_BLOCK_EGRESS=0 together with `--network none` for a fully
# offline CLI run (index, doctor, search).

set -eu

if [ "${DOCSTUDIO_BLOCK_EGRESS:-1}" = "1" ]; then
  if ! command -v iptables >/dev/null 2>&1; then
    echo "docstudio: iptables is missing, cannot seal the network." >&2
    exit 1
  fi

  if ! iptables -F OUTPUT 2>/dev/null; then
    echo "docstudio: cannot apply the egress firewall (NET_ADMIN required)." >&2
    echo "docstudio: add --cap-add NET_ADMIN, or run with --network none and DOCSTUDIO_BLOCK_EGRESS=0." >&2
    exit 1
  fi

  iptables -A OUTPUT -o lo -j ACCEPT
  iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A OUTPUT -j REJECT

  if command -v ip6tables >/dev/null 2>&1; then
    ip6tables -F OUTPUT 2>/dev/null || true
    ip6tables -A OUTPUT -o lo -j ACCEPT 2>/dev/null || true
    ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true
    ip6tables -A OUTPUT -j REJECT 2>/dev/null || true
  fi
fi

exec su-exec node node /app/packages/cli/dist/index.js "$@"
