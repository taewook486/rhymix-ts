#!/usr/bin/env bash
# CG 모드(moai cg) 켜기 전/후 환경 격리 검증 스크립트.
# 배경: tmux pane 분리가 실패해 leader 프로세스 자체가 GLM env를 물려받는
# 사고가 있었음 (Claude로 표시되지만 실제로는 GLM-4.7로 라우팅됨).
set -uo pipefail

TMUX_SESSION="${1:-moai}"
FAIL=0

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }

check_leader_process_env() {
    echo "== 1) leader(claude) 프로세스 자체 env 확인 =="
    local pids
    pids=$(pgrep -x claude 2>/dev/null)
    if [ -z "$pids" ]; then
        yellow "claude 프로세스를 찾지 못함 (아직 시작 안 했으면 정상)"
        return
    fi
    for pid in $pids; do
        if [ ! -r "/proc/$pid/environ" ]; then
            continue
        fi
        local leaked
        leaked=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null \
            | grep -E '^ANTHROPIC_(BASE_URL|AUTH_TOKEN|DEFAULT_(OPUS|SONNET|HAIKU)_MODEL)=')
        if [ -n "$leaked" ]; then
            red "[FAIL] pid $pid (leader)에 GLM 라우팅 env가 있음:"
            echo "$leaked" | sed 's/^/    /'
            FAIL=1
        else
            green "[OK] pid $pid (leader)는 GLM env 없이 순수 Claude API로 동작 중"
        fi
    done
}

check_tmux_session_env() {
    echo "== 2) tmux 세션 '$TMUX_SESSION' 레벨 env 확인 =="
    if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        yellow "tmux 세션 '$TMUX_SESSION' 없음 (CG 모드는 tmux 세션이 필요함)"
        return
    fi
    local sess_env
    sess_env=$(tmux show-environment -t "$TMUX_SESSION" 2>/dev/null \
        | grep -E '^ANTHROPIC_(BASE_URL|AUTH_TOKEN|DEFAULT_(OPUS|SONNET|HAIKU)_MODEL)=')
    if [ -n "$sess_env" ]; then
        yellow "[INFO] 세션 레벨에 GLM env 존재 (새 pane=teammate는 이걸 물려받음):"
        echo "$sess_env" | sed 's/^/    /'
        echo "    -> leader pane에서 'claude'를 새로 띄우면 같이 물려받으므로,"
        echo "       leader는 반드시 이 env가 주입되기 *전에* 이미 떠 있어야 함."
    else
        green "[OK] 세션 레벨 GLM env 없음 (CG 모드 비활성 상태로 보임)"
    fi
}

check_pane_count() {
    echo "== 3) tmux pane 개수 확인 (teammate 격리 전제조건) =="
    if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        return
    fi
    local n
    n=$(tmux list-panes -t "$TMUX_SESSION" -a 2>/dev/null | wc -l)
    echo "    pane 개수: $n"
    if [ "$n" -le 1 ]; then
        yellow "[WARN] pane이 1개뿐 -> teammate가 별도 pane으로 안 분리되고"
        echo "           leader와 같은 프로세스(서브에이전트)로 동작할 가능성이 높음."
        echo "           이 경우 leader/teammate env가 분리되지 않으니 4번 결과를 신뢰할 것."
    fi
}

check_config_residue() {
    echo "== 4) 설정 파일 잔재 확인 =="
    local llm_yaml=".moai/config/sections/llm.yaml"
    local settings_local=".claude/settings.local.json"
    if [ -f "$llm_yaml" ]; then
        local mode
        mode=$(grep -m1 'team_mode:' "$llm_yaml" | sed 's/.*team_mode:[[:space:]]*//')
        echo "    $llm_yaml team_mode = $mode"
    fi
    if [ -f "$settings_local" ] && grep -qE 'ANTHROPIC_(BASE_URL|AUTH_TOKEN)' "$settings_local"; then
        red "[FAIL] $settings_local 에 GLM/ANTHROPIC override가 남아있음"
        FAIL=1
    else
        green "[OK] $settings_local 깨끗함"
    fi
}

echo "CG 모드 환경 격리 검증 (tmux session: $TMUX_SESSION)"
echo
check_leader_process_env
echo
check_tmux_session_env
echo
check_pane_count
echo
check_config_residue
echo

if [ "$FAIL" -ne 0 ]; then
    red "검증 실패: GLM env가 leader 또는 설정 파일을 오염시켰을 수 있음."
    echo "조치: tmux set-environment -t $TMUX_SESSION -u ANTHROPIC_BASE_URL (외 ANTHROPIC_* 변수들), moai cc 로 리셋."
    exit 1
fi

green "검증 통과. leader는 Claude API로 동작 중인 것으로 확인됨."
exit 0
