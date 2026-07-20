# start-moai-cg.ps1
# rhymix-ts : 아래 수동 실행 순서를 그대로 자동화
#   cd D:\project\rhymix-ts\
#   wsl -l -v
#   tmux new -s moai
#   moai cg   (tmux 세션 안에서 입력)
#
# 사용법 (PowerShell):
#   .\start-moai-cg.ps1
# 실행 정책에 막히면:
#   powershell -ExecutionPolicy Bypass -File .\start-moai-cg.ps1

$ErrorActionPreference = 'Stop'

# 1. 프로젝트 루트로 이동
Set-Location 'D:\project\rhymix-ts'

# 2. WSL 배포판 목록
wsl -l -v

# 3. tmux 세션 'moai' 생성 -> 그 안에 'moai cg' 입력 -> attach
#    - new-session -d : 세션을 백그라운드로 먼저 만든다 (이미 있으면 무시)
#    - send-keys      : tmux 세션의 셸에 'moai cg' 를 실제로 타이핑한 것처럼 넣는다
#    - attach         : 그 세션으로 들어간다 (수동으로 tmux new 후 화면 보는 것과 동일)
wsl.exe bash -lic 'tmux new-session -d -s moai 2>/dev/null; tmux send-keys -t moai "moai cg" C-m; tmux attach -t moai'
