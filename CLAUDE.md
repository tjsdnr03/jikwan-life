# CLAUDE.md — 직관생활 프로젝트

## 프로젝트 개요
KBO 야구 직관 기록 + 인스타 카드 생성 웹앱 (PWA)
- **서비스명**: 직관생활 (가칭, 확정 전)
- **타겟**: 20~30대 여성 KBO 팬
- **핵심 가치**: 직관을 기록하고 → 예쁜 카드로 만들어서 → 인스타에 바로 공유

## 기술 스택
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel
- **Language**: TypeScript
- **Image Generation**: html2canvas 또는 @vercel/og
- **PWA**: next-pwa

## 프로젝트 구조
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing / Home
│   ├── login/              # 로그인/회원가입
│   ├── onboarding/         # 응원팀 선택
│   ├── record/             # 직관 기록 작성
│   │   └── [id]/           # 기록 상세/수정
│   ├── card/               # 카드 생성/편집
│   │   └── [id]/           
│   ├── stats/              # 승률 통계
│   ├── calendar/           # 캘린더 뷰
│   └── api/                # API Routes
│       ├── kbo/            # KBO 데이터 크롤링
│       └── card/           # 카드 이미지 생성
├── components/
│   ├── ui/                 # 기본 UI 컴포넌트 (Button, Input, Modal 등)
│   ├── card/               # 카드 템플릿 컴포넌트
│   │   ├── PastelCard.tsx
│   │   ├── ClassicCard.tsx
│   │   └── BoldCard.tsx
│   ├── record/             # 기록 관련 컴포넌트
│   └── layout/             # 레이아웃 컴포넌트
├── lib/
│   ├── supabase.ts         # Supabase 클라이언트
│   ├── kbo.ts              # KBO 데이터 유틸
│   └── utils.ts            # 공통 유틸
├── types/
│   └── index.ts            # TypeScript 타입 정의
└── styles/
    └── globals.css         # Tailwind + 커스텀 스타일
```

## 데이터 모델 (Supabase)

### users 테이블
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
email TEXT UNIQUE NOT NULL
nickname TEXT
my_team TEXT NOT NULL          -- 'lions', 'bears', 'twins' 등
avatar_url TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

### records 테이블
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID REFERENCES users(id)
game_date DATE NOT NULL
stadium TEXT NOT NULL           -- 구장 코드
my_team TEXT NOT NULL
opponent_team TEXT NOT NULL
my_score INTEGER
opponent_score INTEGER
result TEXT                     -- 'win', 'loss', 'draw'
comment TEXT
is_home BOOLEAN DEFAULT true   -- 홈/원정 구분
photos TEXT[]                  -- Supabase Storage URL 배열
created_at TIMESTAMPTZ DEFAULT now()
```

### kbo_games 테이블 (크롤링 데이터 캐시)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
game_date DATE NOT NULL
stadium TEXT NOT NULL
home_team TEXT NOT NULL
away_team TEXT NOT NULL
home_score INTEGER
away_score INTEGER
status TEXT DEFAULT 'scheduled' -- 'scheduled', 'live', 'finished', 'cancelled'
inning_scores JSONB            -- 이닝별 점수
fetched_at TIMESTAMPTZ DEFAULT now()
UNIQUE(game_date, home_team, away_team)
```

## 팀 코드 & 컬러 매핑

```typescript
const TEAMS = {
  lions:   { name: '라이온즈', short: '삼성', color: '#1A56DB', pastel: '#B8D4F8', pastelBg: '#EBF2FD' },
  twins:   { name: '트윈스',   short: 'LG',   color: '#C62828', pastel: '#F4B8B8', pastelBg: '#FDE8E8' },
  tigers:  { name: '타이거즈', short: 'KIA',  color: '#E53935', pastel: '#F8C0B8', pastelBg: '#FDECEB' },
  bears:   { name: '베어스',   short: '두산', color: '#1B1B3A', pastel: '#B8B8D4', pastelBg: '#EBEBF5' },
  eagles:  { name: '이글스',   short: '한화', color: '#F57C00', pastel: '#F8D8B8', pastelBg: '#FDF0E0' },
  giants:  { name: '자이언츠', short: '롯데', color: '#1565C0', pastel: '#B8CCF4', pastelBg: '#E8F0FD' },
  dinos:   { name: '다이노스', short: 'NC',   color: '#00838F', pastel: '#B8E8EC', pastelBg: '#E0F5F7' },
  wiz:     { name: '위즈',     short: 'KT',   color: '#000000', pastel: '#C8C8C8', pastelBg: '#F0F0F0' },
  heroes:  { name: '히어로즈', short: '키움', color: '#880E4F', pastel: '#E8B8D0', pastelBg: '#F8E8F0' },
  landers: { name: '랜더스',   short: 'SSG',  color: '#C62828', pastel: '#F4B8B8', pastelBg: '#FDE8E8' },
} as const;
```

## 구장 코드
```typescript
const STADIUMS = {
  jamsil: { name: '잠실야구장', city: '서울', teams: ['bears', 'twins'] },
  gocheok: { name: '고척스카이돔', city: '서울', teams: ['heroes'] },
  incheon: { name: '인천SSG랜더스필드', city: '인천', teams: ['landers'] },
  suwon: { name: '수원KT위즈파크', city: '수원', teams: ['wiz'] },
  daegu: { name: '대구삼성라이온즈파크', city: '대구', teams: ['lions'] },
  gwangju: { name: '기아챔피언스필드', city: '광주', teams: ['tigers'] },
  daejeon: { name: '한화생명이글스파크', city: '대전', teams: ['eagles'] },
  busan: { name: '사직구장', city: '부산', teams: ['giants'] },
  changwon: { name: '창원NC파크', city: '창원', teams: ['dinos'] },
} as const;
```

## 코딩 컨벤션

### 필수 규칙
- TypeScript strict mode 사용
- 컴포넌트는 함수형 + hooks 패턴
- 파일명: kebab-case (pastel-card.tsx)
- 컴포넌트명: PascalCase (PastelCard)
- Tailwind 사용, 인라인 스타일 최소화
- 한국어 주석 사용 가능
- console.log는 개발 중에만, 커밋 전 제거

### 디자인 원칙
- 타겟: 20~30대 여성 → 파스텔톤, 둥근 모서리, 귀여운 이모지
- 모바일 퍼스트 (PWA)
- 카드 템플릿: 인스타 스토리 비율 (9:16, 1080x1920px)
- 팀 컬러 적용 시 pastel 버전 사용 (직접 구단 컬러 X)

### KBO 라이선스 주의사항
- 구단 로고/마스코트/엠블럼 사용 절대 금지
- 구단 이름은 정보 전달 목적으로만 사용 (팀 선택, 스코어보드)
- 선수 이름은 MVP에서 사용하지 않음
- 자체 캐릭터 사용 (구단 마스코트 유사 캐릭터 금지)
- 색상만 활용 (pastel 버전)

## 개발 단계

### Phase 1: MVP (현재)
1. 프로젝트 세팅 (Next.js + Tailwind + Supabase)
2. 인증 (Supabase Auth - 소셜 로그인)
3. 온보딩 (응원팀 선택)
4. KBO 데이터 크롤러 (경기 결과 자동 매칭)
5. 직관 기록 CRUD
6. 사진 업로드 (최대 5장)
7. 인스타 카드 생성 (파스텔 템플릿 우선)
8. 승률 통계 대시보드
9. 달력 뷰
10. PWA 설정

### Phase 2: 고도화 (추후)
- 클래식/볼드 템플릿 추가
- 집관 기록
- 소셜 기능 (친구, 승률 비교)
- 구장 먹거리 가이드
- 숏폼 영상 생성
