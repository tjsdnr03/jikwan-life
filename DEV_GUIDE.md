# 개발 가이드 — Cursor + Claude Code 워크플로우

> 실제 코드베이스 기준 최신화. (기준: 2026-06, `main`)

## 환경 구성 (완료)
- Node.js 25+ (현재 실행 환경 v25.6.1 기준)
- Cursor Pro (Composer) — Cursor 터미널에서 `claude` 실행
- Claude Code (Opus)
- GitHub: https://github.com/tjsdnr03/jikwan-life
- Vercel: 자동 배포 연동 완료
- Supabase: jikwan-life 프로젝트 (ap-northeast-2 / 서울)

## 개발 시작할 때 매번 하는 것
1. Cursor로 `jikwan-life` 폴더 열기
2. 터미널 탭 1: `npm run dev` (로컬 서버)
3. 터미널 탭 2: `claude` (Claude Code)
4. 브라우저: `localhost:3000`

## 검증 루틴 (코드 변경 후 권장)
```bash
npx tsc --noEmit      # 타입 체크
npx eslint <변경파일>  # 린트 (또는 npm run lint)
npm run build         # 빌드 확인
```

## 도구 분업 원칙
| 작업 | 도구 | 이유 |
|------|------|------|
| UI 컴포넌트/페이지 | Cursor Composer | 가성비, 한도 넉넉 |
| 백엔드/인프라/복잡한 로직 | Claude Code | 높은 정확도 |
| 크롤러/스크립트 | Claude Code | 서버 작업 |
| 디자인 수정 | Cursor Composer | 빠른 반복 |
| 버그 디버깅 | 둘 다 | 콘솔 에러 → Claude Code |

## 효과적인 프롬프트 작성법
```
좋은 예:
"CLAUDE.md의 records 테이블 스키마를 참고해서
직관 기록 작성 폼을 만들어줘.
- 파일: src/app/record/new/page.tsx
- 모바일 최적화, Tailwind CSS, 디자인 토큰(text-text-*, glass) 사용
- lib/teams.ts에서 TEAM_LIST import"

나쁜 예:
"기록 폼 만들어줘"
```

## 저장 & 배포 (매 작업 후)
```bash
git add -A && git commit -m "feat: 기능설명" && git push
```
→ Vercel이 자동 재배포 (2~3분 후 반영). 현재 `main` 브랜치에 직접 커밋하는 흐름.

## 완료된 개발 단계
- [x] Step 1: 프로젝트 세팅 (Next.js 16 + Tailwind v4 + Supabase)
- [x] Step 2: Supabase 클라이언트 설정 (browser/server/admin)
- [x] Step 3: 팀/구장 상수 파일 (teams.ts / stadiums.ts)
- [x] Step 4: 레이아웃 + 하단 탭바
- [x] Step 5: 온보딩 (팀 선택)
- [x] Step 6: 홈 화면
- [x] Step 7: 직관 기록 작성 + 사진 업로드
- [x] Step 8: 이메일 로그인 (매직링크 → OTP 코드) + Gmail SMTP
- [x] Step 9: 카드 생성 + 이미지 저장 (html2canvas-pro) — 신버전 StoryCard/CardEditor로 교체
- [x] Step 10: 승률 통계 (recharts)
- [x] Step 11: 달력 뷰 (KBO 일정 오버레이)
- [x] Step 12: DB 연동 (전체 플로우)
- [x] Step 13: Vercel 배포
- [x] Step 14: KBO 데이터 연동 (네이버 비공식 API, 자동 매칭 + kbo_games 캐싱, 월간 일정)
- [x] Step 15: 기록 목록/상세/수정/삭제
- [x] Step 16: 팀 캐릭터 이미지 (AI 생성 고양이 10팀)
- [x] Step 17: 마이페이지 (프로필, 팀 변경, 로그아웃)
- [x] Step 18: PWA 설정
- [x] Step 19: 세션 안정화 (쿠키 → localStorage 전환, 가드 getUser → getSession, 랜딩 세션 분기)
- [x] Step 20: 전체 글래스 UI 리디자인 (쿨 그레이 + 퓨어 화이트, 디자인 토큰)
- [x] Step 21: 경기 시작 시각 저장(game_datetime/time_tbd) + 홈 카드 표시

## 다음 개발 단계 (우선순위순)
- [ ] 인스타 카드 디자인 개선 (사진 크롭/위치, 가로/세로 대응)
- [ ] 카드 템플릿 추가 (클래식/볼드)
- [ ] 전체 UI 폴리싱 (여백/폰트/디자인 통일성)
- [ ] KBO 데이터 보강 (라인스코어/팀 지표/실시간 상황판 — 조사 완료·미구현)
- [ ] 캐릭터 이미지 스타일 통일
- [ ] 카카오 로그인 (비즈앱 전환 후)
- [ ] 집관 기록 기능 / 닉네임 설정·수정
- [ ] 오프라인 캐싱 (서비스 워커) / 구장 먹거리 가이드
- [ ] 소셜 기능 (친구, 승률 비교) / 숏폼 영상 / 유꾸마켓 연동

## Supabase 설정 정보
- Project URL: https://mdwedauwltxphhdbesee.supabase.co (ap-northeast-2 / 서울)
- Auth: Email provider (OTP 코드, 매직링크 아님)
- SMTP: Gmail (smtp.gmail.com:465)  ※ 대시보드 설정값 — *변경 시 확인 필요*
- Storage: record-photos 버킷 (public, 5MB)
- DB 테이블: users, records, kbo_games
- RLS: 활성화 (본인 데이터만 / kbo_games는 인증 유저 읽기·service_role 쓰기)
- 세션: 브라우저 클라이언트가 localStorage에 저장 (서버 쿠키 세션 미사용)

## 알려진 제약사항 / 주의
- **`html2canvas` 대신 `html2canvas-pro` 사용 필수** (Tailwind v4 oklch 호환) — 절대 되돌리지 말 것
- **StoryCard.tsx / CardEditor.tsx 카드 미리보기는 html2canvas-pro 추출용 인라인 스타일** — 임의 수정 시 카드 PNG 저장이 깨짐 (수정 금지)
- 인증 가드는 **`getSession()` 패턴 유지** (`getUser()`는 콜드 스타트 네트워크 미준비로 로그인 튕김 유발)
- Supabase 무료 플랜 기본 이메일 시간당 3~4개 한도 → Gmail SMTP로 해결
- 카카오 로그인: account_email 권한 필요 → 사업자등록 후 비즈앱 전환 필요
- KBO 라이선스: 구단 로고/마스코트/엠블럼/선수명 사용 금지 → 자체 고양이 캐릭터 + 색상만. **데이터도 경기·팀 단위만**(선수 개인정보 제외)
- DB 컬럼 추가 시: `schema.sql`에 `ALTER ... ADD COLUMN IF NOT EXISTS` 추가 후 **Supabase SQL Editor에서 직접 실행** (앱은 DDL 권한 없음)
- Next 16 기준 — API/관례가 학습 데이터와 다를 수 있음 (`AGENTS.md` 참고)
