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
- **Auth**: 이메일 OTP 코드 로그인 (8자리 코드, signInWithOtp + verifyOtp — 매직링크 아님!)
- **SMTP**: Gmail SMTP (tjsdnr03@gmail.com, smtp.gmail.com:465)
- **Deployment**: Vercel (GitHub 연동 자동 배포)
- **Language**: TypeScript
- **Image Generation**: html2canvas-pro (Tailwind v4 oklch 색상 호환, html2canvas 절대 아님!)
- **Icons**: lucide-react
- **KBO Data**: 네이버 스포츠 API (api-gw.sports.naver.com/schedule/games)
- **개발 도구**: Cursor Pro (Composer 2.5) + Claude Code (Opus)

## 인증 (Auth)
- **현재**: 이메일 OTP 코드 로그인 (8자리 코드 입력, 매직링크 아님)
- **변경 이력**: 카카오 OAuth(KOE205 에러) → 구글 OAuth(보류) → 이메일 매직링크(새 창 UX 문제) → **이메일 OTP 코드 (최종)**
- **카카오 로그인**: 비즈앱 전환(사업자등록) 후 추가 예정 (KOE205 에러 - account_email 권한 필요)
- **이메일 템플릿**: Magic Link 템플릿을 OTP 코드용으로 변경 완료 ({{ .Token }})
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

### kbo_games 테이블 (KBO 데이터 캐싱)
- 네이버 스포츠 API 결과 캐싱
- 월간 범위 조회 지원 (fromDate~toDate 한 번 호출)
- service_role 키로 쓰기

### Supabase Storage
- **버킷**: record-photos (public, 5MB, image/jpeg|png|webp)
- **경로**: record-photos/{userId}/{timestamp}_{filename}
- **Project URL**: https://mdwedauwltxphhdbesee.supabase.co (Seoul/Tokyo region)

## 팀 코드 & 컬러 (lib/teams.ts)
lions, twins, tigers, bears, eagles, giants, dinos, wiz, heroes, landers
각 팀: name, short, color, pastel, pastelBg, mascot 속성

## KBO 데이터 연동
- 네이버 스포츠 API (api-gw.sports.naver.com/schedule/games)
- 날짜+구장 선택 시 상대팀/스코어 자동 매칭
- kbo_games 테이블에 캐싱 후 활용
- 팀명 매핑: 네이버 팀명(삼성, LG 등) → 앱 팀 코드(lions, twins 등)

## 코딩 컨벤션
- TypeScript strict, 함수형 컴포넌트 + hooks
- Tailwind CSS, 모바일 퍼스트 (max-w-md mx-auto)
- 이미지 캡처: html2canvas-pro 사용 (html2canvas로 절대 되돌리지 말 것!)
- 파스텔톤 디자인, 카드는 9:16 비율
- 구단 로고/마스코트/엠블럼 사용 절대 금지, 자체 고양이 캐릭터 + pastel 색상만 활용
- 선수 이름 사용 금지 (퍼블리시티권 이슈, MVP 범위)

## 완료된 기능
- [x] 이메일 OTP 코드 로그인 (8자리, Gmail SMTP)
- [x] 온보딩 (응원팀 선택 → DB 저장)
- [x] 홈 화면 (실시간 데이터, 최근 기록, 오늘의 경기)
- [x] 직관 기록 작성/수정/삭제 (사진 업로드 포함, 최대 5장)
- [x] KBO 데이터 자동 매칭 (날짜+구장 → 상대팀/스코어)
- [x] 인스타 카드 생성 (파스텔 템플릿, 실제 데이터 + 사진)
- [x] 카드 이미지 저장 (PNG 다운로드, Web Share API)
- [x] 기록 전체 목록 + 상세 보기
- [x] 승률 통계 대시보드 (전체/홈원정/상대팀별/최근5경기/승리요정)
- [x] 달력 뷰 (직관기록 + KBO 일정 오버레이, 월 이동)
- [x] 팀 캐릭터 이미지 (AI 생성 고양이, 10팀, rembg 배경제거)
- [x] 마이페이지 (프로필, 팀 변경, 로그아웃)
- [x] 하단 탭바 네비게이션
- [x] PWA 설정 (manifest, 아이콘, 홈 화면 추가)
- [x] Vercel 배포 + GitHub 자동 배포

## 다음 구현 예정 (우선순위순)
- [ ] **인스타 카드 디자인 개선**: 사진 크롭/위치 조정, 가로/세로 대응, 클래식/볼드 템플릿 추가
- [ ] **전체 UI 폴리싱**: 여백/폰트/디자인 통일성 (와이프 피드백 반영)
- [ ] **캐릭터 이미지 개선**: 스타일 통일 (장기적으로 전문 일러스트레이터 의뢰 검토)
- [ ] 카카오 로그인 (사업자등록 → 비즈앱 전환 후)
- [ ] 집관 기록 기능
- [ ] 닉네임 설정/수정
- [ ] 오프라인 캐싱 (서비스 워커)
- [ ] 구장 먹거리 가이드
- [ ] 소셜 기능 (친구, 승률 비교)
- [ ] 숏폼 영상 생성
- [ ] 유꾸마켓 앱 내 연동

## 라이선스/법적 주의사항
- KBO 구단 로고/마스코트/엠블럼 사용 절대 금지
- 구단 이름은 정보 전달 목적으로만 사용
- 선수 이름 사용 금지 (퍼블리시티권 이슈)
- 유사 마스코트 캐릭터 제작 금지 (부정경쟁방지법)
- 유꾸마켓: 상품명에 구단명 직접 사용 금지, "블루 시리즈" 등 색상 표현으로 대체