#!/usr/bin/env bash
# moai-cg.sh - prepare a tmux session and launch 'moai cg' inside it.
#
# Called by start-moai-cg.ps1. The logic lives in this file (rather than as an
# inline bash string in the .ps1) because a complex one-liner does not survive
# the PowerShell 5.1 -> wsl.exe argument boundary intact: redirections and the
# if/else structure get lost, so has-session leaks its stderr and the else
# branch never runs. A single argv element (this file's path) cannot break.
#
# Usage: bash moai-cg.sh [session-name] [model]
#   model: optional alias or ID (opus, opus[1m], sonnet, haiku, claude-...).
#   Passed as ANTHROPIC_MODEL to this session's Claude process only; it takes
#   precedence over the "model" key in the settings files. Empty = settings.

set -u

S="${1:-moai}"
M="${2:-}"
PROJECT_DIR=/mnt/d/project/rhymix-ts

# Session name: letters, digits, underscore and hyphen only.
# Same rule as the ValidatePattern on the .ps1 side.
case "$S" in
    '' | *[!A-Za-z0-9_-]*)
        echo "moai-cg.sh: invalid session name: $S" >&2
        exit 2
        ;;
esac

# Model: same rule as the .ps1 ValidatePattern - name chars plus an optional
# trailing [1m]. No spaces or quotes, so it is safe inside single quotes below.
if [ -n "$M" ] && ! [[ "$M" =~ ^[A-Za-z0-9._-]+(\[1m\])?$ ]]; then
    echo "moai-cg.sh: invalid model: $M" >&2
    exit 2
fi

# '=name' targets exactly that session; a bare '-t moai' would also match
# prefixes such as moai2.
if tmux has-session -t "=$S" 2>/dev/null; then
    echo "tmux session $S already exists - attaching only, moai cg not sent"
    if [ -n "$M" ]; then
        echo "model $M ignored for an existing session - use /model inside it"
    fi
else
    if ! tmux new-session -d -s "$S" -c "$PROJECT_DIR"; then
        echo "moai-cg.sh: tmux new-session failed for session $S" >&2
        exit 1
    fi
    # Prefix form sets the variable for this one command only, so it does not
    # land in the tmux session environment that GLM teammate panes inherit.
    if [ -n "$M" ]; then
        tmux send-keys -t "=$S:" "ANTHROPIC_MODEL='$M' moai cg" C-m
    else
        tmux send-keys -t "=$S:" 'moai cg' C-m
    fi
fi

exec tmux attach -t "=$S"
