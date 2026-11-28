# LGP-004 즐겨찾기 UI 판정표 (moai 작성)

- 범위: 0단계 재편(SPEC-LEGACY-PARITY-000 v0.2.0 §2.3)으로 '즐겨찾기' GNB 그룹의 24개 화면은 005·007 로 옮겼고, 004 는 즐겨찾기 기능 자체만 다룬다.
- 레거시 근거: `/mnt/d/project/rhymix/modules/admin/conf/module.xml:44` — 즐겨찾기 관련 액션은 `procAdminToggleFavorite`(추가/해제 토글) 하나뿐이고 `disp*` 화면은 없다. 각 관리자 화면 상단의 즐겨찾기 토글 폼(`actField=procAdminToggleFavorite`)이 모든 `pages/*.json` 에 공통으로 잡힌다.

| 레거시 기능 | rhymix-ts 대응 | 판정 | 비고 |
|---|---|---|---|
| 화면별 즐겨찾기 추가·해제 토글 (`procAdminToggleFavorite`) | `apps/web/components/admin/AddToFavoritesButton.tsx` + `admin.favorite.add/remove` (`apps/web/server/api/routers/admin/favorite.ts:35,90`) | 대응 있음 | |
| GNB 즐겨찾기 메뉴 표시 | `apps/web/components/admin/AdminSidebar.tsx` 즐겨찾기 섹션 + `admin.favorite.list` (`favorite.ts:20`) | 대응 있음 | |
| (레거시에 없음) 즐겨찾기 순서 변경 | `admin.favorite.reorder` (`favorite.ts:101`) | rhymix-ts 고유 개선 | REQ-LGP-005 보호 대상 |

근거 명령: `grep -n Favorite modules/admin/conf/module.xml` → 44행 1건. `grep -nE "^\s+[a-zA-Z]+:\s*protected" routers/admin/favorite.ts` → list 20 / add 35 / remove 90 / reorder 101.
