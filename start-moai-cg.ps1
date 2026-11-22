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
#   .\start-moai-cg.ps1 -Session moai2 -Model sonnet   (리더 모델 지정)
#   -Model 을 빼면 설정 파일의 model(.claude/settings.local.json)을 쓴다.
#   값은 ANTHROPIC_MODEL 로 그 세션의 Claude 프로세스에만 넘어가며 설정 파일보다 우선한다.
#   예: opus, opus[1m], sonnet, haiku, claude-sonnet-5-5
# 실행 정책에 막히면:
#   powershell -ExecutionPolicy Bypass -File .\start-moai-cg.ps1 -Session moai2
#
# 같은 이름의 세션이 이미 있으면 'moai cg' 를 보내지 않고 attach 만 한다.
# (예전에는 기존 세션의 활성 창에 'moai cg' + Enter 가 그대로 입력됐다)

param(
    # tmux 세션 이름 규칙(. 과 : 금지)보다 좁게 영문·숫자·_·- 만 허용한다.
    # 이 값은 bash 명령에 그대로 들어가므로 따옴표가 필요 없는 문자로 제한한다.
    [ValidatePattern('^[A-Za-z0-9_-]+$')]
    [string]$Session = 'moai',

    # 모델 별칭 또는 ID. 끝에 [1m] 만 추가로 허용한다(예: opus[1m]).
    [ValidatePattern('^([A-Za-z0-9._-]+(\[1m\])?)?$')]
    [string]$Model = ''
)

$ErrorActionPreference = 'Stop'

# 1. 프로젝트 루트로 이동
Set-Location 'D:\project\rhymix-ts'

# 2. WSL 배포판 목록
wsl -l -v

# 3. tmux 세션 준비 + 'moai cg' 실행 -> attach
#    실제 로직은 scripts/moai-cg.sh 안에 있다.
#    예전에는 이 자리에서 bash 한 줄을 문자열로 만들어 wsl.exe 에 넘겼는데,
#    PowerShell 5.1 -> wsl.exe 인수 전달 구간에서 그 문자열이 온전히 전달되지
#    않아 리다이렉션(2>/dev/null)과 if/else 구조가 깨질 수 있었다
#    (-e 를 빼면 $S 가 빈 값으로 미리 치환되는 문제도 있었다).
#    인수를 파일 경로 하나로 줄이면 깨질 지점이 없다.
#    두 값 모두 ValidatePattern 으로 공백·따옴표가 없으므로 작은따옴표로만 감싼다
#    ([1m] 의 대괄호가 glob 으로 해석되지 않게).
wsl.exe bash -lic "bash /mnt/d/project/rhymix-ts/scripts/moai-cg.sh '$Session' '$Model'"
