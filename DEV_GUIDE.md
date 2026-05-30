# 개발 가이드 — Cursor + Claude Code 워크플로우

## 0. 사전 준비 (개발 시작 전)

### 필수 설치
- [ ] Node.js 20+ (https://nodejs.org)
- [ ] Git (https://git-scm.com)
- [ ] Cursor (https://cursor.com) — 설치 후 Claude Code 터미널 설정
- [ ] Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)

### 계정 생성
- [ ] GitHub 계정 (코드 저장소)
- [ ] Supabase 계정 (https://supabase.com) — 무료 티어
- [ ] Vercel 계정 (https://vercel.com) — GitHub 연동 배포
- [ ] 카카오 개발자 계정 (https://developers.kakao.com) — 카카오 로그인용

### Supabase 프로젝트 생성
1. Supabase Dashboard → New Project
2. 프로젝트명: `jikwan-life` (또는 서비스명)
3. Region: Northeast Asia (ap-northeast-1)
4. DB Password 기록해두기
5. 생성 후 Settings → API에서 아래 값 복사:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 1. 프로젝트 초기 세팅

### Cursor에서 프로젝트 시작

Cursor 터미널(또는 Claude Code 터미널)에서:

```
프로젝트를 세팅해줘.
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase 클라이언트 (@supabase/supabase-js, @supabase/ssr)
- next-pwa
- html2canvas
- 프로젝트 이름: jikwan-life
- CLAUDE.md 파일 참고해서 폴더 구조 만들어줘
- .env.local 파일에 Supabase 키 템플릿 만들어줘
```

### .env.local 설정
```
NEXT_PUBLIC_SUPABASE_URL=여기에_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key
```

---

## 2. 개발 순서 (한 단계씩)

> **핵심 원칙**: 한번에 하나의 기능만 완성하고 확인한 뒤 다음으로 넘어갈 것.
> Cursor에서는 자연어로 요청하되, CLAUDE.md의 규격을 참조하라고 명시할 것.

### Step 1: DB 테이블 생성

Claude Code 터미널에서:
```
CLAUDE.md의 데이터 모델 섹션을 참고해서
Supabase SQL Editor에서 실행할 수 있는 
테이블 생성 SQL을 만들어줘.
users, records, kbo_games 테이블.
RLS 정책도 포함해줘 - 유저는 자기 데이터만 CRUD 가능하게.
```

→ 생성된 SQL을 Supabase Dashboard → SQL Editor에 붙여넣기 → Run

### Step 2: Supabase 클라이언트 설정

```
CLAUDE.md 참고해서 lib/supabase.ts 파일 만들어줘.
서버 컴포넌트용, 클라이언트 컴포넌트용 각각.
@supabase/ssr 패키지 사용.
```

### Step 3: 팀/구장 상수 파일

```
CLAUDE.md의 TEAMS와 STADIUMS 상수를
lib/teams.ts, lib/stadiums.ts 파일로 만들어줘.
타입도 types/index.ts에 정의해줘.
```

### Step 4: 레이아웃 + 하단 탭바

```
PRD.md 참고해서 모바일 앱 느낌의 레이아웃을 만들어줘.
- 하단 탭바: 홈, 기록, 달력, 통계, 마이 (5개 탭)
- 아이콘은 lucide-react 사용
- 375px 모바일 퍼스트
- 파스텔 블루 계열 포인트 컬러
```

### Step 5: 온보딩 — 팀 선택 화면

```
PRD.md 온보딩 섹션 참고.
/onboarding 페이지를 만들어줘.
- 10개 팀이 2열 그리드로 표시
- 각 카드에 팀 pastel 색상 배경 + 팀명
- 선택하면 하이라이트 + "시작하기" 버튼 활성화
- Supabase에 users 테이블에 my_team 저장
```

### Step 6: 홈 화면

```
PRD.md 홈 화면 섹션 참고.
/home 페이지를 만들어줘.
- 상단: 닉네임 + 팀 뱃지 + 시즌 승률
- 중앙: 최근 기록 카드 (없으면 빈 상태 안내)
- 하단: "오늘의 직관 기록하기" 큰 CTA 버튼
- records 테이블에서 최근 3개 가져오기
```

### Step 7: 직관 기록 작성

```
PRD.md "직관 기록 작성" 플로우를 구현해줘.
/record/new 페이지.
- Step 방식 (날짜 → 구장 → 매칭 → 사진 → 코멘트)
- 날짜: date picker (기본값 오늘)
- 구장: 9개 구장 카드 선택
- KBO 매칭: 지금은 수동 입력 (크롤러는 다음 단계)
  → 상대팀 선택 + 스코어 입력 + 홈/원정
- 사진: file input (최대 5장, Supabase Storage 업로드)
- 코멘트: textarea (100자)
- 저장 → records 테이블에 INSERT
```

### Step 8: KBO 데이터 크롤러

이 단계는 **Claude Code**에서 진행:
```
KBO 공식 사이트(koreabaseball.com)에서
특정 날짜의 경기 결과를 크롤링하는
API Route를 만들어줘. app/api/kbo/route.ts

입력: date (YYYY-MM-DD)
출력: 해당 날짜의 모든 경기 결과
  [{homeTeam, awayTeam, homeScore, awayScore, stadium, status}]

결과를 kbo_games 테이블에 캐싱.
이미 캐싱된 날짜면 DB에서 바로 반환.
```

### Step 9: 카드 생성 (킬러 기능)

```
PRD.md "인스타 카드 생성" 섹션 참고.
/card/[recordId] 페이지를 만들어줘.

1. 해당 record 데이터 로드
2. 사진 선택 (record의 photos 중 1장)
3. 파스텔 템플릿으로 9:16 카드 렌더링
   - CLAUDE.md의 팀 pastel 컬러 사용
   - 경기 결과 + 스코어 + 승률 + 코멘트 배치
   - 가로/세로 사진 자동 처리
4. html2canvas로 이미지 생성
5. "저장" 버튼 → 이미지 다운로드
6. "인스타 공유" 버튼 → Web Share API
```

### Step 10: 승률 통계

```
/stats 페이지를 만들어줘.
records 테이블에서 현재 유저의 기록을 집계.
- 전체 승률 (원형 차트 또는 큰 숫자)
- 홈/원정 승률
- 상대팀별 승률 (막대 차트)
- 최근 5경기 결과 (승/패 dot)
차트는 recharts 사용.
```

### Step 11: 달력 뷰

```
/calendar 페이지를 만들어줘.
- 월간 캘린더 UI
- 직관 기록이 있는 날짜에 색상 dot 표시
  (승: 초록, 패: 빨강, 무: 회색)
- 날짜 탭 → 해당 기록 상세로 이동
- 좌우 스와이프로 월 이동
```

### Step 12: PWA 설정 + 배포

```
PWA 설정을 해줘.
- manifest.json (앱 이름, 아이콘, 색상)
- service worker (next-pwa)
- 앱 아이콘 (192x192, 512x512)

Vercel 배포:
- vercel.json 설정
- GitHub 연동 자동 배포
```

---

## 3. Cursor 사용 팁

### 효과적인 프롬프트 작성법

**좋은 예:**
```
CLAUDE.md의 records 테이블 스키마를 참고해서
직관 기록 작성 폼 컴포넌트를 만들어줘.
- 파일: components/record/record-form.tsx
- Step 방식 UI (날짜 → 구장 → 팀/스코어 → 사진 → 코멘트)
- Tailwind CSS로 모바일 최적화
- 타입은 types/index.ts에서 import
```

**나쁜 예:**
```
기록 폼 만들어줘
```

### Claude Code 터미널 활용 시점

| 작업 | Cursor (에디터) | Claude Code (터미널) |
|------|---------------|-------------------|
| UI 컴포넌트 개발 | ✅ 추천 | |
| 페이지 레이아웃 | ✅ 추천 | |
| API Route 개발 | ✅ 또는 | ✅ |
| 크롤러/스크립트 | | ✅ 추천 |
| DB 마이그레이션 | | ✅ 추천 |
| 배포/인프라 설정 | | ✅ 추천 |
| 버그 디버깅 | ✅ 또는 | ✅ |
| 파일 구조 변경 | | ✅ 추천 |

### 작업 단위 관리

매 Step 완료 시:
```bash
git add .
git commit -m "feat: Step N - 기능명"
git push
```

Vercel이 자동 배포 → 폰에서 바로 확인 가능.

---

## 4. 트러블슈팅 자주 나오는 문제

### Supabase RLS 에러
→ "Row Level Security policy" 관련 에러 → SQL Editor에서 RLS 정책 확인

### 이미지 업로드 실패
→ Supabase Storage에 버킷 생성 필요 (public 버킷: 'record-photos')

### html2canvas 한글 깨짐
→ 폰트 로딩 완료 후 캡처, `useForeignObjectRendering: true` 옵션

### PWA 캐시 문제
→ 개발 중에는 PWA 비활성화, 배포 시에만 활성화

---

## 5. 예상 일정

| 주차 | Step | 예상 시간 | 비고 |
|------|------|----------|------|
| Week 1 | Step 1~3 | 4~6시간 | DB + 기본 설정 |
| Week 2 | Step 4~5 | 4~6시간 | 레이아웃 + 온보딩 |
| Week 3 | Step 6~7 | 6~8시간 | 홈 + 기록 작성 (핵심) |
| Week 4 | Step 8 | 4~6시간 | KBO 크롤러 |
| Week 5~6 | Step 9 | 8~10시간 | 카드 생성 (킬러 기능) |
| Week 7 | Step 10~11 | 4~6시간 | 통계 + 달력 |
| Week 8 | Step 12 | 3~4시간 | PWA + 배포 |
| **합계** | | **33~46시간** | **약 2개월** (주 5~6시간) |
