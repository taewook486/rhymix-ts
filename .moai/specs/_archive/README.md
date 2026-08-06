# SPEC 보관 폴더

`status: completed`인 SPEC 문서를 여기로 옮겨서 `.moai/specs/` 최상위를 진행 중인 SPEC만 남도록 정리했다 (2026-08-06).

- MoAI 도구 자체에 정식 보관 규칙은 없다. 이 폴더는 사람이 보기 편하도록 만든 구조이며, `.moai/specs/SPEC-*/`처럼 최상위 1단계만 훑는 스크립트(`plan-auditor`, 프론트매터 훅, 레거시 마이그레이션 가이드 등)는 자동으로 이 폴더를 건너뛴다.
- 완료 현황 요약은 `.moai/specs/INDEX.md`와 `CHANGELOG.md`에 있다.
- 진행 중인 SPEC(`.moai/specs/` 최상위)이 완료되면 이 폴더로 옮기면 된다.
