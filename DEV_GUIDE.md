# 개발 가이드 — Cursor + Claude Code 워크플로우

## 환경 구성 (완료)
- Node.js 25+
- Cursor Pro (Composer 2.5)
- Claude Code (Opus 4.6+) — Cursor 터미널에서 `claude` 실행
- GitHub: https://github.com/tjsdnr03/jikwan-life
- Vercel: 자동 배포 연동 완료
- Supabase: jikwan-life 프로젝트 (ap-northeast-2)

## 개발 시작할 때 매번 하는 것
1. Cursor로 `jikwan-life` 폴더 열기
2. 터미널 탭 1: `npm run dev` (로컬 서버)
3. 터미널 탭 2: `claude` (Claude Code)
4. 브라우저: `localhost:3000`

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
- 모바일 최적화, Tailwind CSS
- lib/teams.ts에서 TEAM_LIST import"

나쁜 예:
"기록 폼 만들어줘"
```

## 저장 & 배포 (매 작업 후)
```bash
git add -A && git commit -m "feat: 기능설명" && git push
```
→ Vercel이 자동 재배포 (2~3분 후 반영)

## 완료된 개발 단계
- [x] Step 1: 프로젝트 세팅 (Next.js + Tailwind + Supabase)
- [x] Step 2: Supabase 클라이언트 설정
- [x] Step 3: 팀/구장 상수 파일
- [x] Step 4: 레이아웃 + 하단 탭바
- [x] Step 5: 온보딩 (팀 선택)
- [x] Step 6: 홈 화면
- [x] Step 7: 직관 기록 작성 + 사진 업로드
- [x] Step 8: 이메일 로그인 + Gmail SMTP
- [x] Step 9: 카드 생성 + 이미지 저장
- [x] Step 10: 승률 통계
- [x] Step 11: 달력 뷰
- [x] Step 12: DB 연동 (전체 플로우)
- [x] Step 13: Vercel 배포

## 다음 개발 단계
- [ ] Step 14: KBO 데이터 크롤러
- [ ] Step 15: 카드 템플릿 추가 (클래식/볼드)
- [ ] Step 16: 카카오 로그인 (비즈앱 전환 후)
- [ ] Step 17: PWA 설정
- [ ] Step 18: 디자인 폴리싱

## Supabase 설정 정보
- Project URL: https://mdwedauwltxphhdbesee.supabase.co
- Auth: Email provider (매직링크)
- SMTP: Gmail (smtp.gmail.com:465)
- Storage: record-photos 버킷 (public)
- DB 테이블: users, records, kbo_games
- RLS: 활성화 (본인 데이터만 접근)

## 알려진 제약사항
- html2canvas 대신 html2canvas-pro 사용 필수 (Tailwind v4 oklch 호환)
- Supabase 무료 플랜: 이메일 시간당 3-4개 → Gmail SMTP로 해결
- 카카오 로그인: account_email 권한 필요 → 비즈앱 전환 필요