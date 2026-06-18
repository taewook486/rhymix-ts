@echo off
chcp 65001 >nul
REM moai cg 세션 시작 스크립트 (Windows -> WSL -> tmux -> moai cg)

REM 1) 프로젝트 폴더로 이동
cd /d D:\project\rhymix-ts

REM 2) WSL 배포판 상태 확인
echo [1/2] WSL distributions:
wsl -l -v
echo.

REM 3) WSL 안에서 tmux 세션(moai)을 만들고 moai cg 실행
REM    - 이미 moai 세션이 있으면 attach, 없으면 새로 생성하며 moai cg 기동
echo [2/2] tmux 세션(moai) 진입 + moai cg 실행...
wsl -e bash -lic "cd /mnt/d/project/rhymix-ts && (tmux attach -t moai || tmux new -s moai 'moai cg; exec bash')"
