<div align="center">

# Messenger

### 팀의 대화와 근태를 한곳에 모은 실시간 사내 메신저

React · TypeScript · Node.js · Socket.IO로 만든 풀스택 프로젝트입니다.

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)

</div>

---

실제 프로젝트 코드와 상세 문서는 [`messenger-mvp/`](./messenger-mvp) 디렉터리에 있습니다.

**바로가기**

- [프로젝트 소개 · 주요 기능](./messenger-mvp/README.md#프로젝트-소개)
- [빠른 시작 (로컬 실행 방법)](./messenger-mvp/README.md#빠른-시작)
- [시스템 구성 / API 개요](./messenger-mvp/README.md#시스템-구성)

## 한눈에 보기

- **실시간 메시징** — 1:1 DM, 그룹 채널, 스레드, 이모지 반응, 파일 공유, 메시지 고정
- **조직 운영** — 부서별 조직도, 출퇴근 체크인/체크아웃, 팀 실시간 근태 현황
- **협업 편의** — `@멘션`, 검색, 커스텀 상태(자리비움/방해금지), 채널 음소거, 다크 모드

```bash
cd messenger-mvp/server && npm install && npm run seed && npm run dev   # http://localhost:4000
cd messenger-mvp/client && npm install && npm run dev                    # http://localhost:5173
```

자세한 실행 방법과 데모 계정은 [`messenger-mvp/README.md`](./messenger-mvp/README.md)를 참고하세요.
