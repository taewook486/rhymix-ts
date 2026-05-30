---
description: Gemini CLI 로 코드/변경사항 리뷰
argument-hint: "[all | staged | head | <prompt>]"
allowed-tools: Bash
---

## Gemini 코드 리뷰

전제: `~/.gemini/settings.json` 에 API 키가 저장되어 있어야 합니다 (현재 설정 완료).
Node.js 와 gemini CLI 가 `/c/Program Files/nodejs` + `/c/Users/taewo/AppData/Roaming/npm` 에 설치되어 있음.

### 공통 환경 (모든 명령 앞에 prefix)

```bash
export PATH="/c/Users/taewo/AppData/Roaming/npm:/c/Program Files/nodejs:$PATH"
export GEMINI_CLI_TRUST_WORKSPACE=true
```

### 변경사항 리뷰 (uncommitted)

```bash
git diff HEAD | gemini --skip-trust -p "변경사항 리뷰해줘, 한국어로"
```

### 변경사항 리뷰 (직전 커밋)

```bash
git diff HEAD~1 | gemini --skip-trust -p "변경사항 리뷰해줘, 한국어로"
```

### Staged 리뷰

```bash
git diff --cached | gemini --skip-trust -p "스테이지된 변경사항 리뷰해줘, 한국어로"
```

### 전체 TypeScript 리뷰 (대용량 — 토큰 주의)

```bash
git ls-files '*.ts' '*.tsx' | xargs cat | gemini --skip-trust -p "TypeScript 코드 리뷰해줘, 한국어로"
```

### 사용자 정의 프롬프트

argument 가 위 키워드(`all`/`staged`/`head`) 가 아니면 그대로 프롬프트로 사용:

```bash
git diff HEAD | gemini --skip-trust -p "$ARGUMENTS"
```
