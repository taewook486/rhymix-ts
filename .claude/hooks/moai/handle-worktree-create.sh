#!/bin/bash
# MoAI WorktreeCreate Hook — Claude Code v2.1.49+
#
# 역할: agent용 git worktree를 생성하고 경로를 JSON {"worktreePath":"..."} 으로 반환한다.
# stdout에는 JSON만 출력 — git의 informational 메시지도 완전히 억제.

temp_file=$(mktemp)
trap 'rm -f "$temp_file"' EXIT
cat > "$temp_file"

# JSON 파일에서 값 추출
json_get() {
    python3 -c "
import sys, json
try:
    with open(sys.argv[1]) as f:
        d = json.load(f)
    print(sys.argv[2])
    keys = sys.argv[2].split('.')
    v = d
    for k in keys:
        v = v.get(k, '') if isinstance(v, dict) else ''
    print(str(v) if v else '', end='')
except Exception:
    pass
" "$temp_file" "$1" 2>/dev/null
}

agent_name=$(python3 -c "
import sys, json
try:
    with open('$temp_file') as f:
        d = json.load(f)
    print(d.get('agentName', d.get('agent_name', 'agent')))
except Exception:
    print('agent')
" 2>/dev/null)
[ -z "$agent_name" ] && agent_name="agent"

project_dir=$(python3 -c "
import sys, json
try:
    with open('$temp_file') as f:
        d = json.load(f)
    s = d.get('session', {})
    print(s.get('projectDir', s.get('cwd', '')))
except Exception:
    print('')
" 2>/dev/null)
[ -z "$project_dir" ] && project_dir=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# 경로 및 브랜치 이름 계산
timestamp=$(date +%Y%m%d-%H%M%S)
safe_name=$(echo "$agent_name" | tr '/' '-' | tr ' ' '-' | cut -c1-40)
worktree_dir="${project_dir}/.claude/worktrees/${safe_name}-${timestamp}"
branch_name="worktree/${safe_name}-${timestamp}"

mkdir -p "${project_dir}/.claude/worktrees" 2>/dev/null

# 이미 존재하면 제거
if [ -d "$worktree_dir" ]; then
    git -C "$project_dir" worktree remove --force "$worktree_dir" >/dev/null 2>&1 || \
    rm -rf "$worktree_dir" 2>/dev/null || true
fi

# worktree 생성 — stdout + stderr 모두 억제 (JSON만 출력)
if git -C "$project_dir" worktree add -b "$branch_name" "$worktree_dir" >/dev/null 2>&1; then
    printf '{"worktreePath":"%s"}\n' "$worktree_dir"
    exit 0
fi

# 브랜치 이름 충돌 시 detach 모드로 재시도
if git -C "$project_dir" worktree add --detach "$worktree_dir" >/dev/null 2>&1; then
    printf '{"worktreePath":"%s"}\n' "$worktree_dir"
    exit 0
fi

# 생성 실패
exit 1
