# 사내 메신저 MVP

기획서(1차 MVP 범위)에 따라 구현한 실시간 메신저 수직 슬라이스입니다.

## 포함된 기능

- 이메일/비밀번호 로그인·회원가입 (JWT) — 실제 SSO/AD 연동 전 임시 인증
- 조직도 디렉터리(부서별 사용자 목록) → 클릭 시 1:1 DM 시작
- 그룹 채널 생성(이름 + 멤버 선택)
- 실시간 메시지 송수신 (Socket.io), 채널별 이력 조회
- 타이핑 표시, 온라인/오프라인 프레즌스
- 읽음 처리 및 채널별 안 읽은 메시지 뱃지

## 이번 범위에서 제외한 것 (다음 단계)

- 파일/이미지 업로드
- 음성/영상 통화
- 실제 SSO/LDAP/AD 연동 (지금은 자체 회원가입으로 대체)
- 모바일 앱, 데스크톱(Electron) 패키징
- AI 기능(요약/스마트 리플라이 등)

## 기술 스택

| 영역 | 선택 |
|---|---|
| 서버 | Node.js + Express + Socket.io |
| 저장소 | JSON 파일 기반 저장소 (`server/data/db.json`) — 네이티브 모듈 설치 이슈 없이 바로 실행되도록 선택. Phase 2에서 PostgreSQL로 교체 예정 |
| 인증 | JWT (jsonwebtoken) + bcryptjs |
| 클라이언트 | React + TypeScript + Vite, socket.io-client |

## 실행 방법

### 1. 서버

```bash
cd server
npm install
npm run seed   # 데모 조직도 계정 생성 (최초 1회)
npm run dev    # http://localhost:4000
```

시드 계정 (비밀번호 공통 `password123`):

- admin@example.com (김관리, 경영지원팀)
- dev1@example.com (이개발, 개발팀)
- dev2@example.com (박코딩, 개발팀)
- design1@example.com (최디자인, 디자인팀)
- sales1@example.com (정영업, 영업팀)

### 2. 클라이언트

```bash
cd client
npm install
npm run dev    # http://localhost:5173
```

브라우저 두 개(또는 시크릿 창)를 열어 서로 다른 계정으로 로그인하면 실시간 메시징을 바로 확인할 수 있습니다.

## 환경 변수

- 서버: `JWT_SECRET`(기본값은 개발용이며 운영 배포 전 반드시 교체), `PORT`(기본 4000), `CLIENT_ORIGIN`(기본 `http://localhost:5173`)
- 클라이언트: `VITE_API_URL`(기본 `http://localhost:4000`)

## 알려진 이슈

- `client`의 `vite`/`esbuild` 개발 서버에 알려진 CORS 취약점(GHSA-67mh-4wv8-2f99)이 있습니다. 로컬 개발 서버에만 영향을 주며 프로덕션 빌드에는 영향 없습니다. 메이저 업그레이드(`vite@8`)가 필요해 별도 승인 없이 자동 반영하지 않았습니다.
- 데이터 저장소가 JSON 파일이라 동시 쓰기 성능/트랜잭션 안전성이 낮습니다. 실사용 전 PostgreSQL 전환이 필요합니다(기획서 Phase 2).
