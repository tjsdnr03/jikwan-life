# CLAUDE.md — 직관생활 프로젝트

> 이 파일은 실제 코드베이스 스캔 기준으로 최신화되어 있습니다. (기준: 2026-06, `main`)
> 코드 현황의 최종 진실은 항상 `git log`와 실제 소스입니다.

## 프로젝트 개요
KBO 야구 직관 기록 + 인스타 카드 생성 웹앱 (PWA)
- **서비스명**: 직관생활
- **타겟**: 20~30대 여성 KBO 팬
- **핵심 가치**: 직관을 기록하고 → 예쁜 카드로 만들어서 → 인스타에 바로 공유
- **배포**: https://jikwan-life.vercel.app
- **GitHub**: https://github.com/tjsdnr03/jikwan-life

## 기술 스택 (package.json 기준)
- **Framework**: Next.js 16 (App Router). Turbopack은 Next 16 기본 번들러 (스크립트에 별도 `--turbopack` 플래그 없음)
- **UI/언어**: React 19, TypeScript (strict)
- **Styling**: Tailwind CSS v4 (CSS-first — `@tailwindcss/postcss`, 별도 `tailwind.config` 없음. 토큰은 `src/app/globals.css`의 `@theme`)
- **폰트**: Pretendard (`globals.css`에서 CDN `@import`, `--font-pretendard`)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage) — `@supabase/supabase-js`, `@supabase/ssr`
- **Auth**: 이메일 OTP 코드 로그인 (8자리, `signInWithOtp` + `verifyOtp` — 매직링크 아님!)
- **Image Generation**: `html2canvas-pro` (Tailwind v4 oklch 색상 호환, **`html2canvas`로 교체 절대 금지!**)
- **Icons**: `lucide-react` · **Charts**: `recharts` (통계 탭)
- **Deployment**: Vercel (GitHub 연동 자동 배포)
- **개발 도구**: Cursor Pro (Composer) + Claude Code

## 인증 (Auth)
- **방식**: 이메일 OTP 코드 (8자리 코드 입력). Gmail SMTP 발송.
- **변경 이력**: 카카오 OAuth(KOE205) → 구글 OAuth(보류) → 이메일 매직링크(새 창 UX 문제) → **이메일 OTP 코드 (최종)**
- **세션 저장**: 브라우저 클라이언트(`src/lib/supabase.ts`)는 `@supabase/supabase-js`의 `createClient`를 **싱글톤**으로 만들고 세션을 **localStorage**에 저장 (`persistSession`/`autoRefreshToken` true).
  - 이유: iOS standalone PWA에서 JS 쿠키는 ITP 7일 제한·재실행 보존 불안정 → localStorage가 안정적.
- **인증 가드**: 모든 페이지가 클라이언트에서 **`getSession()`**(로컬, 네트워크 X)으로 확인. `getUser()`(네트워크)는 **사용 안 함** — 콜드 스타트 시 로그인으로 튕기던 버그 때문.
- **랜딩(`/`)**: 세션 있으면 `/home`으로 라우팅 (PWA가 `/`로 실행돼도 홈 진입).
- 서버측 인증 게이팅(middleware)·SSR 쿠키 세션은 **사용 안 함**. `supabase-server.ts`(쿠키)는 `/api/kbo` 폴백·(미사용)카카오 콜백 전용. `supabase-admin.ts`(service_role)는 캐시 쓰기용.
- **카카오 로그인**: 사업자등록 → 비즈앱 전환 후 추가 예정 (account_email 권한 필요).

## 프로젝트 구조 (실제)
```
src/
├── app/
│   ├── layout.tsx              # Root layout (lang="ko", 메타데이터, PWA)
│   ├── globals.css             # 전역 CSS + 디자인 토큰(@theme, --accent, glass 유틸)
│   ├── page.tsx                # 랜딩(/). 세션 있으면 /home 으로 라우팅
│   ├── login/page.tsx          # 이메일 OTP 로그인 (이메일→코드 2-step)
│   ├── auth/callback/route.ts  # (현재 미사용) 카카오 OAuth 콜백
│   ├── onboarding/page.tsx     # 응원팀 선택 (10개 구단) → users 저장
│   ├── home/page.tsx           # 메인 홈 (시즌요약/최근기록/오늘의 경기+시작시각/CTA)
│   ├── record/
│   │   ├── page.tsx            # 직관 기록 전체 목록
│   │   ├── new/page.tsx        # 기록 작성 (사진 최대 5장, 날짜+구장→경기 자동매칭)
│   │   ├── [id]/page.tsx       # 기록 상세
│   │   └── [id]/edit/page.tsx  # 기록 수정/삭제
│   ├── card/
│   │   ├── page.tsx            # 카드 진입(서버 컴포넌트)
│   │   ├── [id]/page.tsx       # 특정 기록 → 카드 생성 (신버전: CardEditor+StoryCard)
│   │   └── preview/page.tsx    # 최신 기록으로 카드 미리보기/편집
│   ├── stats/page.tsx          # 승률 통계 (recharts)
│   ├── calendar/page.tsx       # 달력 (직관 기록 + KBO 일정 오버레이)
│   └── api/
│       ├── kbo/route.ts        # KBO 경기 API (네이버 → kbo_games 캐시). ?date / ?month
│       └── card/route.ts       # 카드 관련 API
├── components/
│   ├── card/
│   │   ├── StoryCard.tsx       # ★ 신버전 카드(표시). CardData·BG_PRESETS export
│   │   ├── CardEditor.tsx      # ★ 신버전 에디터(모드/배경/사진/EXIF정규화/PNG추출·공유)
│   │   ├── pastel-card.tsx     # (구버전·보존, 미사용)
│   │   ├── classic-card.tsx    # (스텁/미구현)
│   │   ├── bold-card.tsx       # (스텁/미구현)
│   │   └── types.ts            # (구버전 CardData — StoryCard의 CardData와 다름!)
│   ├── layout/bottom-nav.tsx   # 하단 탭바(홈/기록/달력/통계/마이). variant="default"|"glass"
│   ├── record/record-card.tsx  # 기록 리스트 카드
│   ├── team/team-mascot.tsx    # 팀 캐릭터(고양이) 이미지(로드 실패 시 이모지 폴백)
│   └── ui/button.tsx           # 공통 버튼(variant: primary/secondary/ghost)
├── lib/
│   ├── supabase.ts             # ★ 브라우저 클라이언트(localStorage 세션, 싱글톤)
│   ├── supabase-server.ts      # 서버(쿠키) 클라이언트(@supabase/ssr) — /api/kbo 폴백 등
│   ├── supabase-admin.ts       # service_role 클라이언트(RLS 우회, 캐시 쓰기)
│   ├── teams.ts                # TEAMS 상수 (10개 구단)
│   ├── stadiums.ts             # STADIUMS 상수 (9개 구장)
│   ├── kbo.ts                  # 경기 매칭 헬퍼
│   ├── cardData.ts             # recordToCardData(): 기록 → StoryCard CardData 변환
│   └── utils.ts                # cn, getResult, resultLabel, formatDate, displayDate, winRate, formatKstTime 등
└── types/index.ts              # 전역 TypeScript 타입

supabase/
├── schema.sql                  # DB 테이블 + RLS (실행 완료)
└── storage.sql                 # Storage 버킷 (실행 완료)

public/  manifest.json · icons/ · mascots/   # PWA 매니페스트·앱아이콘·팀 캐릭터 PNG
```

## 데이터 모델 (Supabase — schema.sql 기준)

### users 테이블
- id: UUID (auth.users 참조) · email: TEXT UNIQUE NOT NULL · nickname: TEXT
- my_team: TEXT NOT NULL (팀 코드) · avatar_url: TEXT · created_at: TIMESTAMPTZ

### records 테이블
- id: UUID · user_id: UUID · game_date: DATE · stadium: TEXT
- my_team, opponent_team: TEXT · my_score, opponent_score: INTEGER
- result: 'win' | 'loss' | 'draw' · comment: TEXT · is_home: BOOLEAN
- photos: TEXT[] (Supabase Storage URL 배열) · created_at: TIMESTAMPTZ

### kbo_games 테이블 (공용 경기 캐시)
- game_date: DATE · **game_datetime: TIMESTAMPTZ (KST +09:00 보정)** · **time_tbd: BOOLEAN**
- stadium · home_team · away_team: TEXT · home_score, away_score: INTEGER
- status: 'scheduled'|'live'|'finished'|'cancelled'
- inning_scores: JSONB (**컬럼만 존재, 현재 미수집**) · fetched_at: TIMESTAMPTZ
- UNIQUE (game_date, home_team, away_team) · 쓰기는 service_role

### Supabase Storage
- **버킷**: record-photos (public, 5MB, image/jpeg|png|webp)
- **경로**: record-photos/{userId}/{timestamp}_{filename}
- **Project URL**: https://mdwedauwltxphhdbesee.supabase.co (ap-northeast-2 / 서울)

## 팀 & 구장 상수
- **팀**(`lib/teams.ts`): `lions, twins, tigers, bears, eagles, giants, dinos, wiz, heroes, landers`
  - 각 팀 속성: `code, name, short, color, pastel, pastelBg, mascot, emoji`
- **구장**(`lib/stadiums.ts`): 9개. 각 속성: `code, name(정식), short(잠실/고척…), city, teams(홈팀들; 잠실=두산·LG 공용)`

## KBO 데이터 연동
- **소스**: 네이버 스포츠 **비공식** API `api-gw.sports.naver.com/schedule/games` (User-Agent/Referer 헤더 필요)
- **엔드포인트**: `/api/kbo?date=YYYY-MM-DD`(그 날짜 결과), `/api/kbo?month=YYYY-MM`(그 달 전체 일정, 월 범위 1콜)
- **캐시**: `kbo_games` 테이블 (service_role upsert). 확정(종료/취소) 경기는 캐시 신뢰, 예정/진행은 재요청.
- **매핑**: 네이버 팀명/구장(삼성, LG…) → 앱 코드(lions, twins…), 과거명 보정 포함.

## 디자인 토큰 & 컨벤션 (globals.css)
- **현재 톤**: 쿨 그레이 글래스 UI + 퓨어 화이트 배경 + accent 블루. (구 "파스텔톤" 아님)
- **배경**: `--background: #ffffff`
- **카드 표면**: `.glass-card` = `--glass-bg` rgba(241,243,246,…) → **#f1f3f6 쿨 그레이 베이스 + blur**
- **accent**: `--accent: #3b6fd4` (블루). 팀 컬러 교체 시 `--accent*`만 변경
- **텍스트 토큰**: `text-text-primary / text-text-secondary / text-text-tertiary` (Tailwind 매핑)
- **하단 네비**: 모든 페이지에서 `<BottomNav variant="glass" />`
- **레이아웃**: 모바일 퍼스트 `max-w-md mx-auto` · 카드는 9:16 비율
- TypeScript strict, 함수형 컴포넌트 + hooks. 페이지는 대부분 `"use client"` + 클라 데이터 패칭.

## ⚠️ 절대 지켜야 할 규칙 (어기면 깨짐)
- **이미지 캡처는 `html2canvas-pro`만** (Tailwind v4 oklch 호환). `html2canvas`로 되돌리지 말 것.
- **`StoryCard.tsx` / `CardEditor.tsx`의 카드 미리보기는 html2canvas-pro 추출용 인라인 스타일(hex/rgba)로 구성** — Tailwind 클래스로 바꾸거나 임의로 손대면 **카드 PNG 저장이 깨짐**. 수정 금지.
- 카드 `CardData` 타입은 **`StoryCard.tsx`에서** import (구버전 `components/card/types.ts`와 혼동 주의).

## 라이선스/법적 주의사항 (엄수)
- KBO 구단 **로고/마스코트/엠블럼 사용 절대 금지** → 자체 고양이 캐릭터 + 팀 색상만 활용
- **선수 이름·라인업 등 선수 개인정보 사용 금지** (퍼블리시티권). **데이터도 경기·팀 단위만** 사용(네이버 응답의 선수명/박스스코어 제외)
- 구단 이름은 정보 전달 목적으로만 사용 · 유사 마스코트 제작 금지(부정경쟁방지법)
- 유꾸마켓: 상품명에 구단명 직접 사용 금지, "블루 시리즈" 등 색상 표현으로 대체

## 완료된 기능
- [x] 이메일 OTP 코드 로그인 (8자리, Gmail SMTP) + 세션 안정화(localStorage·getSession)
- [x] 온보딩 (응원팀 선택 → DB 저장)
- [x] 홈 화면 (실시간 데이터, 최근 기록, 오늘의 경기 + 시작 시각)
- [x] 직관 기록 작성/목록/상세/수정/삭제 (사진 최대 5장)
- [x] KBO 데이터 자동 매칭 + 월간 일정 (`?date`/`?month`, kbo_games 캐시, 시작 시각 저장)
- [x] 인스타 카드 생성 (StoryCard/CardEditor 신버전, 실제 데이터 + 사진, EXIF 정규화)
- [x] 카드 이미지 저장 (PNG 다운로드, Web Share API, html2canvas-pro)
- [x] 승률 통계 대시보드 (recharts)
- [x] 달력 뷰 (직관기록 + KBO 일정 오버레이, 홈/원정·오늘 표시)
- [x] 팀 캐릭터 이미지 (AI 생성 고양이 10팀)
- [x] 마이페이지 (프로필, 팀 변경, 로그아웃)
- [x] 하단 탭바(글래스) · PWA · Vercel 자동 배포
- [x] 전체 글래스 UI 리디자인 (쿨 그레이 + 퓨어 화이트)

## 다음 구현 예정 (우선순위순)
- [ ] **인스타 카드 디자인 개선**: 사진 크롭/위치 조정, 가로/세로 대응, 클래식/볼드 템플릿
- [ ] **전체 UI 폴리싱**: 여백/폰트/디자인 통일성
- [ ] **캐릭터 이미지 개선**: 스타일 통일
- [ ] KBO 데이터 보강: 라인스코어(`inning_scores`)·팀 단위 지표·실시간 상황판(이닝/아웃/BS/주자) — *조사 완료, 미구현*
- [ ] 카카오 로그인 (비즈앱 전환 후) · 집관 기록 · 닉네임 설정/수정
- [ ] 오프라인 캐싱(서비스 워커) · 구장 먹거리 가이드 · 소셜(친구/승률 비교) · 숏폼 영상 · 유꾸마켓 연동
