# 직관생활 — 프로젝트 핸드오프 (구조·파일·문서 안내)

> 이 문서는 **새 Claude 채팅방이 이 프로젝트를 빠르게 완전히 이해**하도록 만든 지도(map)입니다.
> "앞으로 할 일/중요 결정"은 사용자가 별도로 설명합니다. 이 문서는 **프로젝트 폴더의 파일·문서가
> 무엇이고 어떤 형식인지, 어디를 봐야 하는지**에 집중합니다.
> (작성 기준: 2026-06, `main` 브랜치. 코드 현황의 최종 진실은 항상 git 히스토리와 실제 소스입니다.)

---

## 0. 30초 요약

- **무엇**: KBO 야구 **직관 기록 → 예쁜 인스타 스토리 카드 생성 → 공유** 웹앱 (PWA).
- **타겟**: 20~30대 여성 KBO 팬. 핵심 차별화는 "기록"이 아니라 **"기록 → 카드 → 공유" 플로우**.
- **스택**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase(Postgres+Auth+Storage) · Vercel 자동배포.
- **배포**: https://jikwan-life.vercel.app · **저장소**: https://github.com/tjsdnr03/jikwan-life
- **인증**: 이메일 OTP 코드(8자리) 로그인. 세션은 **localStorage** 저장.
- **경기 데이터**: 네이버 스포츠 비공식 API → `/api/kbo` 라우트 → Supabase `kbo_games` 캐시.

---

## 1. 문서(.md/.sql) 안내 — 무엇을 언제 읽나

| 파일 | 형식/역할 | 새 채팅방이 이걸 보면 |
|---|---|---|
| **`CLAUDE.md`** | 프로젝트 지침서(권위 있음). 개요·스택·구조·데이터모델·코딩컨벤션·완료/예정 기능. Claude가 항상 따르는 규칙. | **가장 먼저** 전체 그림 파악 |
| **`PRD.md`** | 제품 요구사항(MVP). 비전·완료 기능·화면별 스펙. | "제품이 무엇을 해야 하나" |
| **`직관생활_대화요약.md`** | 이전 채팅방들과의 **대화 누적 요약**(사업 배경·의사결정 히스토리·시행착오). | "왜 이렇게 결정됐나"(배경/맥락) |
| **`DEV_GUIDE.md`** | 개발 워크플로우(Cursor+Claude Code 분업, 로컬 실행 절차, Supabase/Vercel 환경). | "어떻게 개발·배포하나" |
| **`README.md`** | create-next-app 기본 템플릿(거의 그대로, 프로젝트 정보 없음). | 무시해도 됨 |
| **`AGENTS.md`** | "이 Next.js는 학습 데이터와 다르다 — `node_modules/next/dist/docs/` 참고하라"는 경고. | Next 16 API 주의 |
| **`supabase/schema.sql`** | DB 테이블·RLS 정의(SQL). Supabase SQL Editor에 붙여 실행. `IF NOT EXISTS`/`ALTER ... ADD COLUMN IF NOT EXISTS`로 재실행 안전. | 데이터 모델·마이그레이션 |
| **`supabase/storage.sql`** | Storage 버킷(record-photos) 정의. | 이미지 업로드 인프라 |
| **`HANDOFF.md`** | (이 문서) 구조 지도. | 오리엔테이션 |

> ⚠️ **문서 신선도**: 문서(특히 PRD/CLAUDE.md의 "완료 기능" 목록)는 작성 시점 스냅샷이라 일부 뒤처질 수 있음.
> **현재 코드 상태의 진실은 `git log`와 실제 소스 파일**입니다. 충돌 시 소스를 신뢰하세요.

---

## 2. 기술 스택 (실제 `package.json` 기준)

- **런타임/프레임워크**: `next@16.2.6` (App Router), `react@19.2.4`
- **언어**: TypeScript (strict)
- **스타일**: `tailwindcss@^4` (+ `@tailwindcss/postcss`). 설정은 **CSS-first** — `src/app/globals.css`의 `@theme`/디자인 토큰 사용(별도 tailwind.config 없음).
- **백엔드/DB/Auth/Storage**: Supabase (`@supabase/supabase-js@^2`, `@supabase/ssr@^0.10`)
- **이미지 캡처**: `html2canvas-pro@^2` ← **반드시 이것. 일반 `html2canvas` 아님** (Tailwind v4의 oklch 등 최신 컬러 함수 지원).
- **아이콘**: `lucide-react` · **차트**: `recharts`
- **스크립트**: `npm run dev` / `build` / `start` / `lint`

검증 루틴(코드 변경 후 권장): `npx tsc --noEmit` → `npx eslint <파일>` → `npm run build`.

---

## 3. 폴더/파일 구조 — 파일별 역할

```
src/
├── app/                          # Next.js App Router (페이지=서버에서 1회 렌더되는 "use client" 컴포넌트가 대부분)
│   ├── layout.tsx                # 루트 레이아웃 (메타데이터, PWA 설정, lang="ko")
│   ├── globals.css               # 전역 CSS + 디자인 토큰(@theme, --accent, glass 유틸 등)
│   ├── page.tsx                  # 랜딩(/). 진입 시 getSession→로그인 상태면 /home 으로 라우팅
│   ├── login/page.tsx            # 이메일 OTP 로그인(2-step: 이메일→코드)
│   ├── auth/callback/route.ts    # (현재 미사용) 카카오 OAuth 콜백용 서버 라우트
│   ├── onboarding/page.tsx       # 최초 1회 응원팀 선택 → users 테이블 저장
│   ├── home/page.tsx             # 메인 홈: 시즌요약/최근기록/"오늘의 경기"카드/CTA
│   ├── record/
│   │   ├── page.tsx              # 직관 기록 전체 목록
│   │   ├── new/page.tsx          # 기록 작성(사진 최대 5장 업로드, 날짜+구장→경기 자동매칭)
│   │   ├── [id]/page.tsx         # 기록 상세
│   │   └── [id]/edit/page.tsx    # 기록 수정/삭제
│   ├── card/
│   │   ├── page.tsx              # 카드 진입(서버 컴포넌트)
│   │   ├── [id]/page.tsx         # 특정 기록으로 카드 생성 (신버전: CardEditor+StoryCard)
│   │   └── preview/page.tsx      # 최신 기록으로 카드 미리보기/편집
│   ├── stats/page.tsx            # 승률 통계 대시보드(recharts)
│   ├── calendar/page.tsx         # 달력: 직관 기록 + KBO 일정 오버레이(상대팀/홈원정/시각)
│   └── api/
│       ├── kbo/route.ts          # ★ KBO 경기 API (네이버 소스 → kbo_games 캐시). 아래 5장 참고
│       └── card/route.ts         # 카드 관련 API
├── components/
│   ├── card/
│   │   ├── StoryCard.tsx         # ★ 신버전 카드(표시). CardData 타입·BG_PRESETS 여기서 export
│   │   ├── CardEditor.tsx        # ★ 신버전 카드 에디터(모드/배경/사진/EXIF정규화/PNG추출·공유)
│   │   ├── pastel-card.tsx       # (구버전, 미사용이나 보존) 옛 카드 템플릿
│   │   ├── classic-card.tsx      # (스텁/미구현)
│   │   ├── bold-card.tsx         # (스텁/미구현)
│   │   └── types.ts             # (구버전 CardData 타입 — StoryCard의 CardData와 다름!)
│   ├── layout/bottom-nav.tsx     # 하단 탭바: 홈/기록/달력/통계/마이
│   ├── record/record-card.tsx    # 기록 리스트 카드 컴포넌트
│   ├── team/team-mascot.tsx      # 팀 캐릭터(고양이) 이미지 (로드 실패시 이모지 폴백)
│   └── ui/button.tsx             # 공통 버튼 (variant: primary/secondary/ghost)
├── lib/
│   ├── supabase.ts               # ★ 브라우저 클라이언트 (localStorage 세션, 싱글톤). 4장 참고
│   ├── supabase-server.ts        # 서버(쿠키) 클라이언트 (@supabase/ssr). /api/kbo 폴백 등에만
│   ├── supabase-admin.ts         # service_role 클라이언트(RLS 우회). 캐시 쓰기용
│   ├── teams.ts                  # ★ TEAMS 상수(10구단: code/name/short/color/pastel/mascot/emoji)
│   ├── stadiums.ts               # ★ STADIUMS 상수(9구장: code/name/short/city/teams)
│   ├── kbo.ts                    # 경기 매칭 헬퍼(기록 작성 시 날짜+구장→경기)
│   ├── cardData.ts               # recordToCardData(): 직관 기록 → StoryCard CardData 변환
│   └── utils.ts                  # cn/getResult/resultLabel/formatDate/displayDate/winRate/formatKstTime 등
└── types/index.ts                # ★ 전역 타입 (TeamCode/StadiumCode/Record/KBOGame/KBOGameResult 등)

supabase/  schema.sql · storage.sql      # DB/Storage 정의(실행 완료)
public/    manifest.json · icons/ · mascots/   # PWA 매니페스트·앱아이콘·팀 캐릭터 PNG
```

`★` = 자주 손대거나 핵심인 파일.

---

## 4. 인증 / 세션 (중요 — 과거에 크게 고생한 영역)

- **로그인**: 이메일 **OTP 코드**(8자리). `signInWithOtp` → `verifyOtp`. 매직링크 아님. (Gmail SMTP)
- **브라우저 클라이언트** `src/lib/supabase.ts`:
  - `@supabase/supabase-js`의 `createClient`를 **싱글톤**으로 생성, 세션을 **localStorage**에 저장.
  - 이유: iOS standalone PWA에서 JS 쿠키는 ITP 7일 제한·재실행 보존 불안정 → localStorage가 안정적.
  - `persistSession: true`, `autoRefreshToken: true`.
- **인증 가드**: 모든 페이지가 클라이언트에서 **`getSession()`**(로컬, 네트워크 X)으로 확인. `getUser()`(네트워크 호출)는 **쓰지 않음** — 콜드 스타트 네트워크 미준비 시 로그인으로 튕기던 버그 때문.
- **랜딩(`/`)**: 세션 있으면 `/home`으로 보냄(PWA가 `/`로 실행돼도 홈 진입).
- 서버측 인증 게이팅(middleware)·SSR 쿠키 세션은 **사용 안 함**. `supabase-server.ts`(쿠키)는 `/api/kbo` 폴백과 (미사용)카카오 콜백에서만.
- 보안은 Supabase **RLS**가 서버에서 강제(클라 getSession은 UX 용도).

---

## 5. KBO 경기 데이터 (`src/app/api/kbo/route.ts`)

- **소스**: 네이버 스포츠 비공식 API `https://api-gw.sports.naver.com/schedule/games` (User-Agent/Referer 헤더 필요).
- **엔드포인트**:
  - `/api/kbo?date=YYYY-MM-DD` → 그 날짜 경기 결과(`KBOGameResult[]`)
  - `/api/kbo?month=YYYY-MM` → 그 달 전체 일정(`KBOScheduleGame[]`, `date` 포함). **월 범위 1콜**로 가져옴.
- **캐시**: Supabase `kbo_games` 테이블. service_role로 upsert. 확정(종료/취소) 경기는 캐시 신뢰, 예정/진행은 재요청.
- **매핑**: 네이버 팀명/구장 → 우리 `TeamCode`/`StadiumCode` (`teams.ts`/`stadiums.ts` 기반, 과거명 보정 포함).
- **응답 필드**: homeTeam/awayTeam/homeScore/awayScore/stadium/status/**gameDateTime**/**timeTbd** (+ schedule는 date).
- 참고: `inning_scores` 컬럼은 있으나 **현재 미수집(null)**. 라인스코어/팀성적/실시간 상황(이닝·아웃·BS·주자)은 네이버 `record`/`preview`/`relay` 게임 상세 엔드포인트에 존재함이 **조사로 확인되었으나 아직 미구현**.

---

## 6. 데이터 모델 (Supabase — `schema.sql`)

- **`users`**: `id`(=auth.users.id) · `email` · `nickname` · `my_team`(TeamCode) · `avatar_url` · `created_at`
- **`records`**(직관 기록): `id` · `user_id` · `game_date` · `stadium` · `my_team` · `opponent_team` · `my_score` · `opponent_score` · `result`('win'|'loss'|'draw') · `comment` · `is_home` · `photos`(TEXT[], Storage URL) · `created_at`
- **`kbo_games`**(공용 경기 캐시): `game_date` · **`game_datetime`(TIMESTAMPTZ, KST+09:00)** · **`time_tbd`** · `stadium` · `home_team` · `away_team` · `home_score` · `away_score` · `status` · `inning_scores`(JSONB, 미사용) · `fetched_at` · UNIQUE(game_date, home_team, away_team)
- **RLS**: users=본인만, records=본인만, kbo_games=인증 유저 읽기/서버(service_role) 쓰기.
- **Storage 버킷** `record-photos` (public, 5MB, jpeg/png/webp), 경로 `record-photos/{userId}/{timestamp}_{filename}`.
- 모든 TS 타입은 `src/types/index.ts`에 정의.

---

## 7. 카드 시스템 (헷갈리기 쉬움 — 2개 공존)

- **신버전(사용 중)**: `StoryCard.tsx`(표시) + `CardEditor.tsx`(편집). `CardData` 타입은 **`StoryCard.tsx`에서 export**.
  - 9:16 비율, `fill`/`matte` 모드, 배경색 프리셋, 데코, 사진 업로드.
  - **사진 EXIF 회전 정규화**(업로드 시 canvas로 굽기) + **PNG 추출/공유**(html2canvas-pro, `useCORS`).
  - 진입: `/card/[id]`(특정 기록), `/card/preview`(최신 기록). 변환은 `lib/cardData.ts`의 `recordToCardData()`.
- **구버전(보존, 미사용)**: `pastel-card.tsx` + `components/card/types.ts`의 다른 `CardData`, `classic/bold-card.tsx`(스텁).
  - ⚠️ `CardData`가 두 군데(`StoryCard.tsx` vs `components/card/types.ts`)에 **서로 다르게** 존재. import 출처 주의.

---

## 8. 팀·구장 상수 & 디자인 규칙

- **팀**(`lib/teams.ts`): `lions/twins/tigers/bears/eagles/giants/dinos/wiz/heroes/landers`. 각 `name`(라이온즈)·`short`(삼성)·`color`·`pastel`·`pastelBg`·`mascot`(고양이 PNG)·`emoji`.
- **구장**(`lib/stadiums.ts`): 9개. `name`(정식)·`short`(잠실/고척…)·`city`·`teams`(홈팀들; 잠실=두산·LG 공용).
- **디자인**: 모바일 퍼스트(`max-w-md mx-auto`). 현재 톤 = **쿨 그레이 글래스 UI + 퓨어 화이트 배경**. 토큰은 `globals.css`(`--accent`, `--background`, glass 유틸 등). 카드 9:16.
- **라이선스 금지(엄수)**: 구단 **로고/마스코트/엠블럼 사용 금지**, **선수 이름·라인업 사용 금지**(퍼블리시티권). 자체 고양이 캐릭터 + pastel 색상만.

---

## 9. 현재 완료된 기능 (git 히스토리 기준)

로그인(OTP)·온보딩·홈(시즌요약/최근기록/오늘의 경기+시작시각)·기록 작성/목록/상세/수정·삭제(+사진)·KBO 자동매칭·인스타 카드 생성/저장/공유·통계 대시보드·달력(기록+KBO일정 오버레이)·마이페이지·하단탭·PWA·Vercel 자동배포·전체 글래스 리디자인.
세부 진행은 `git log` 참고(최근: 경기 시작시각 저장·표시, 톤 쿨계열 전환, 세션 안정화).

---

## 10. 새 채팅방을 위한 작업 팁

- **Next 16/React 19** 기준. 학습데이터와 다를 수 있으니 `AGENTS.md` 경고 유의(필요시 `node_modules/next/dist/docs/`).
- 페이지는 대부분 `"use client"` + 클라 데이터 패칭. 인증 가드는 **`getSession()` 패턴 유지**.
- 이미지 캡처는 **`html2canvas-pro`만**. 카드 `CardData`는 **`StoryCard.tsx`에서** import.
- 코드 변경 후 **`npx tsc --noEmit` → `npm run build`**로 검증. 커밋/푸시는 사용자가 요청할 때만(브랜치 main 직접 사용 중).
- DB 컬럼 추가 시: `schema.sql`에 `ALTER ... ADD COLUMN IF NOT EXISTS` 넣고 **Supabase SQL Editor에서 직접 실행**(앱이 DB 접근 권한 없음).
