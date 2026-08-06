# @rhymix-ts/ui

Rhymix-TS 공용 UI 컴포넌트 패키지.

Radix UI 기반 프리미티브 컴포넌트와 Tailwind 클래스 병합 유틸리티를 제공한다.

## 설치

```bash
pnpm add @rhymix-ts/ui
```

## 주요 exports

| export | 설명 |
|---|---|
| `cn` | `clsx` + `tailwind-merge` 클래스 병합 유틸리티 |
| `./components` (subpath) | `Button`, `Checkbox`, `Input`, `Label`, `Table`, `Textarea`, `Dialog`, `DropdownMenu`, `Badge`, `Sonner`(토스트), `NotificationBell` |

루트 배럴은 `Dialog` 컴포넌트도 함께 노출한다(`TermsConsent`가 `@rhymix-ts/ui`에서 직접 import하기 때문).

## 의존성

- `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `lucide-react`, `sonner`, `tailwind-merge`
- `react`, `react-dom` (peer)
