// 조직도 데모 데이터 시드 스크립트. 실행: npm run seed
// 실제 SSO/AD 연동 전까지 로그인 테스트용 계정을 만들어 둔다.
const bcrypt = require("bcryptjs");
const db = require("./db");

const SEED_USERS = [
  { email: "admin@example.com", name: "김관리", department: "경영지원팀" },
  { email: "dev1@example.com", name: "이개발", department: "개발팀" },
  { email: "dev2@example.com", name: "박코딩", department: "개발팀" },
  { email: "design1@example.com", name: "최디자인", department: "디자인팀" },
  { email: "sales1@example.com", name: "정영업", department: "영업팀" },
];

const SEED_PASSWORD = "password123";

async function seed() {
  db.load();
  const created = [];

  for (const spec of SEED_USERS) {
    if (db.findUserByEmail(spec.email)) continue;
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    const user = db.createUser({ ...spec, passwordHash });
    created.push(user);
  }

  if (created.length === 0) {
    console.log("이미 시드 데이터가 존재합니다. 추가 작업 없음.");
  } else {
    console.log(`${created.length}명의 데모 사용자를 생성했습니다.`);
  }

  const users = db.listUsers();
  const general = users.length
    ? db.listChannelsForUser(users[0].id).find((c) => c.type === "group" && c.name === "전체 공지")
    : null;

  if (!general && users.length > 1) {
    db.createChannel({
      type: "group",
      name: "전체 공지",
      memberIds: users.map((u) => u.id),
      createdBy: users[0].id,
    });
    console.log("'전체 공지' 그룹 채널을 생성했습니다.");
  }

  console.log("\n로그인 테스트 계정 (비밀번호 공통: %s)", SEED_PASSWORD);
  for (const spec of SEED_USERS) {
    console.log(`  - ${spec.email} (${spec.name}, ${spec.department})`);
  }
}

seed().then(() => process.exit(0));
