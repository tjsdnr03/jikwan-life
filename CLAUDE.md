# CLAUDE.md — 직관생활 프로젝트

## 프로젝트 개요
KBO 야구 직관 기록 + 인스타 카드 생성 웹앱 (PWA)
- **서비스명**: 직관생활
- **타겟**: 20~30대 여성 KBO 팬
- **핵심 가치**: 직관을 기록하고 → 예쁜 카드로 만들어서 → 인스타에 바로 공유
- **배포**: https://jikwan-life.vercel.app
- **GitHub**: https://github.com/tjsdnr03/jikwan-life

## 기술 스택
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Auth**: 이메일 매직링크 (Supabase Auth signInWithOtp)
- **SMTP**: Gmail SMTP (커스텀 SMTP 설정 완료)
- **Deployment**: Vercel (GitHub 연동 자동 배포)
- **Language**: TypeScript
- **Image Generation**: html2canvas-pro (Tailwind v4 oklch 색상 호환, html2canvas 아님!)
- **Icons**: lucide-react

## 인증 (Auth)
- **현재**: 이메일 매직링크 (비밀번호 없이 이메일 링크로 로그인)
- **카카오 로그인**: 비즈앱 전환 후 추가 예정 (KOE205 에러 - account_email 권한 필요)
- **세션**: 로그인 후 세션 유지 (브라우저 닫아도 유지됨)

## 프로젝트 구조
```
src/
├── app/
│   ├── layout.tsx              # Root layout (lang="ko", 메타데이터)
│   ├── page.tsx                # 랜딩 페이지
│   ├── login/page.tsx          # 이메일 매직링크 로그인
│   ├── auth/callback/route.ts  # 매직링크 콜백 처리
│   ├── onboarding/page.tsx     # 응원팀 선택 (10개 구단)
│   ├── home/page.tsx           # 메인 홈 (DB 연동)
│   ├── record/
│   │   ├── page.tsx
│   │   ├── new/page.tsx        # 직관 기록 작성 (사진 업로드 포함)
│   │   └── [id]/page.tsx
│   ├── card/
│   │   ├── [id]/page.tsx       # 실제 기록 기반 카드 생성 + 이미지 저장
│   │   └── preview/page.tsx    # 카드 미리보기 (더미 데이터)
│   ├── stats/page.tsx          # 승률 통계 (DB 연동)
│   ├── calendar/page.tsx       # 달력 뷰 (DB 연동)
│   └── api/
│       ├── kbo/route.ts        # KBO 데이터 (미구현)
│       └── card/route.ts
├── components/
│   ├── ui/button.tsx
│   ├── card/
│   │   ├── pastel-card.tsx     # 파스텔 카드 템플릿 (메인, 사용중)
│   │   ├── classic-card.tsx    # 클래식 템플릿 (미구현)
│   │   ├── bold-card.tsx       # 볼드 템플릿 (미구현)
│   │   └── types.ts            # CardData 타입
│   ├── record/record-card.tsx
│   └── layout/bottom-nav.tsx   # 하단 탭바 (홈/기록/달력/통계/마이)
├── lib/
│   ├── supabase.ts             # 브라우저 Supabase 클라이언트
│   ├── supabase-server.ts      # 서버 Supabase 클라이언트 (@supabase/ssr)
│   ├── teams.ts                # TEAMS 상수 (10개 구단 컬러/이름)
│   ├── stadiums.ts             # STADIUMS 상수 (9개 구장)
│   ├── kbo.ts                  # 경기 매칭 헬퍼
│   └── utils.ts                # cn, getResult, formatDate, winRate 등
├── types/index.ts              # TypeScript 타입 정의
└── styles/globals.css

supabase/
├── schema.sql                  # DB 테이블 생성 SQL (실행 완료)
└── storage.sql                 # Storage 버킷 생성 SQL (실행 완료)
```

## 데이터 모델 (Supabase - 적용 완료)

### users 테이블
- id: UUID (auth.users 참조)
- email: TEXT UNIQUE NOT NULL
- nickname: TEXT
- my_team: TEXT NOT NULL (팀 코드)
- avatar_url: TEXT
- created_at: TIMESTAMPTZ

### records 테이블
- id: UUID (자동 생성)
- user_id: UUID (users 참조)
- game_date: DATE
- stadium: TEXT
- my_team, opponent_team: TEXT
- my_score, opponent_score: INTEGER
- result: 'win' | 'loss' | 'draw'
- comment: TEXT
- is_home: BOOLEAN
- photos: TEXT[] (Supabase Storage URL 배열)
- created_at: TIMESTAMPTZ

### Supabase Storage
- **버킷**: record-photos (public, 5MB, image/jpeg|png|webp)
- **경로**: record-photos/{userId}/{timestamp}_{filename}

## 팀 코드 & 컬러 (lib/teams.ts)
lions, twins, tigers, bears, eagles, giants, dinos, wiz, heroes, landers
각 팀: name, short, color, pastel, pastelBg 속성

## 코딩 컨벤션
- TypeScript strict, 함수형 컴포넌트 + hooks
- Tailwind CSS, 모바일 퍼스트 (max-w-md mx-auto)
- 이미지 캡처: html2canvas-pro 사용 (html2canvas 아님!)
- 파스텔톤 디자인, 카드는 9:16 비율
- 구단 로고/마스코트 사용 금지, pastel 색상만 활용

## 완료된 기능
- [x] 이메일 매직링크 로그인 + Gmail SMTP
- [x] 온보딩 (응원팀 선택 → DB 저장)
- [x] 홈 화면 (실시간 데이터, 최근 기록 표시)
- [x] 직관 기록 작성 (사진 업로드 포함, 최대 5장)
- [x] 인스타 카드 생성 (파스텔 템플릿, 실제 데이터 + 사진)
- [x] 카드 이미지 저장 (PNG 다운로드, Web Share API)
- [x] 승률 통계 대시보드 (실시간 계산)
- [x] 달력 뷰 (실시간, 월 이동)
- [x] 하단 탭바 네비게이션
- [x] Vercel 배포 + GitHub 자동 배포

## 다음 구현 예정
- [ ] KBO 데이터 크롤러 (경기 결과 자동 매칭)
- [ ] 클래식/볼드 카드 템플릿 추가
- [ ] 카카오 로그인 (비즈앱 전환 후)
- [ ] 사진 크롭/위치 조정 기능
- [ ] 구장 먹거리 가이드
- [ ] PWA 설정
- [ ] 소셜 기능 (친구, 승률 비교)