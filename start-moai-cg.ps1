# start-moai-cg.ps1
# rhymix-ts : 아래 수동 실행 순서를 그대로 자동화
#   cd D:\project\rhymix-ts\
#   wsl -l -v
#   tmux new -s moai
#   moai cg   (tmux 세션 안에서 입력)
#
# 사용법 (PowerShell):
#   .\start-moai-cg.ps1                  (세션 이름 기본값 moai)
#   .\start-moai-cg.ps1 -Session moai2   (다른 이름으로 새 세션)
# 실행 정책에 막히면:
#   powershell -ExecutionPolicy Bypass -File .\start-moai-cg.ps1 -Session moai2
#
# 같은 이름의 세션이 이미 있으면 'moai cg' 를 보내지 않고 attach 만 한다.
# (예전에는 기존 세션의 활성 창에 'moai cg' + Enter 가 그대로 입력됐다)

param(
    # tmux 세션 이름 규칙(. 과 : 금지)보다 좁게 영문·숫자·_·- 만 허용한다.
    # 이 값은 bash 명령에 그대로 들어가므로 따옴표가 필요 없는 문자로 제한한다.
    [ValidatePattern('^[A-Za-z0-9_-]+$')]
    [string]$Session = 'moai'
)

$ErrorActionPreference = 'Stop'

# 1. 프로젝트 루트로 이동
Set-Location 'D:\project\rhymix-ts'

# 2. WSL 배포판 목록
wsl -l -v

# 3. tmux 세션 생성 -> 그 안에 'moai cg' 입력 -> attach
#    - has-session    : 같은 이름 세션이 이미 있으면 새로 만들지도, 'moai cg' 를 보내지도 않는다
#    - new-session -d : 세션을 백그라운드로 먼저 만든다
#    - -c <경로>      : 세션의 시작 디렉터리를 프로젝트 루트로 고정한다
#    - send-keys      : 새 세션의 셸에 'moai cg' 를 실제로 타이핑한 것처럼 넣는다
#    - attach         : 그 세션으로 들어간다 (수동으로 tmux new 후 화면 보는 것과 동일)
#    - '=이름'        : 정확히 그 이름만 대상으로 한다 (그냥 -t moai 는 moai2 같은 접두어 일치도 잡는다)
#    wsl.exe 로 넘기는 문자열에는 큰따옴표를 쓰지 않는다 (PowerShell 5.1 인수 전달에서 깨진다).
#    -e 는 빼면 안 된다: -e 가 없으면 wsl 이 기본 셸로 명령줄을 한 번 더 해석하면서 $S 를
#    빈 값으로 미리 치환한다. 그러면 'new-session -s  -c <경로>' 가 되어 경로를 명령으로 실행한
#    창이 바로 죽고, 'no server running' / 'no sessions' 만 남는다.
$bash = 'S=__SESSION__; if tmux has-session -t =$S 2>/dev/null; then echo tmux session $S already exists - attaching only, moai cg not sent; else tmux new-session -d -s $S -c /mnt/d/project/rhymix-ts && tmux send-keys -t =$S: ''moai cg'' C-m; fi; tmux attach -t =$S'
$bash = $bash.Replace('__SESSION__', $Session)
wsl.exe -e bash -lic $bash
