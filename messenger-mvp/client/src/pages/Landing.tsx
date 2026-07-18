import Icon from "../components/Icon";
import type { IconName } from "../components/Icon";

interface Props {
  onGetStarted: () => void;
  onLogin: () => void;
}

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "message", title: "실시간 메시징", desc: "1:1 DM과 그룹 채널, 스레드 답장으로 맥락을 잃지 않는 대화." },
  { icon: "search", title: "빠른 검색", desc: "지난 대화와 자료를 키워드 하나로 찾아 바로 이동." },
  { icon: "attach", title: "파일 공유", desc: "이미지는 바로 미리보기, 문서는 채널에서 곧장 다운로드." },
  { icon: "smile", title: "이모지 반응 · 멘션", desc: "빠른 리액션과 `@멘션`으로 필요한 사람에게만 정확히 전달." },
  { icon: "pin", title: "메시지 고정", desc: "중요한 공지나 링크는 채널 상단에 고정해 놓치지 않게." },
  { icon: "clock", title: "출퇴근 관리", desc: "출근·퇴근 체크와 팀 실시간 근태 현황을 같은 곳에서." },
  { icon: "moon", title: "커스텀 상태", desc: "자리비움 · 방해금지와 상태 메시지로 지금 상황을 공유." },
  { icon: "bell", title: "알림 제어", desc: "채널별 음소거와 브라우저 알림으로 필요한 순간에만 집중." },
];

const STEPS = [
  { title: "팀 계정 만들기", desc: "이메일로 가입하고 소속 부서를 등록하면 조직도에 자동으로 반영돼요." },
  { title: "동료 초대 · 채널 생성", desc: "조직도에서 동료를 선택해 DM을 시작하거나, 목적에 맞는 그룹 채널을 만드세요." },
  { title: "대화하며 협업", desc: "실시간 메시지, 파일 공유, 출퇴근 기록까지 — 흩어진 도구 없이 한 화면에서." },
];

const PLANS = [
  {
    name: "Starter",
    price: "무료",
    desc: "소규모 팀이 바로 시작하기 좋은 구성",
    features: ["무제한 1:1 DM · 그룹 채널", "메시지 검색 · 스레드", "파일 공유 (최대 20MB)"],
    highlight: false,
  },
  {
    name: "Team",
    price: "문의",
    desc: "출퇴근 관리와 알림 제어가 필요한 팀",
    features: ["Starter의 모든 기능", "출퇴근 체크인 · 팀 현황판", "채널 음소거 · 커스텀 상태"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "문의",
    desc: "SSO 연동과 운영 정책이 필요한 조직",
    features: ["Team의 모든 기능", "SSO / LDAP 연동", "감사 로그 · 관리자 콘솔"],
    highlight: false,
  },
];

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Icon name="message" size={Math.round(size * 0.55)} />
    </span>
  );
}

export default function Landing({ onGetStarted, onLogin }: Props) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <BrandMark size={30} />
          <span>Messenger</span>
        </div>
        <div className="landing-nav-actions">
          <button className="landing-link-button" onClick={onLogin}>
            로그인
          </button>
          <button className="landing-cta-button" onClick={onGetStarted}>
            무료로 시작하기
          </button>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">사내 커뮤니케이션 플랫폼</span>
          <h1>
            팀의 대화와 근태를
            <br />
            한 곳에서 관리하세요
          </h1>
          <p>
            실시간 메시징부터 스레드, 파일 공유, 출퇴근 체크인까지 — 흩어져 있던 사내 도구를 하나의
            워크스페이스로 모았습니다.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-cta-button large" onClick={onGetStarted}>
              무료로 시작하기
            </button>
            <button className="landing-secondary-button large" onClick={onLogin}>
              로그인
            </button>
          </div>
        </div>

        <div className="landing-hero-visual" aria-hidden="true">
          <div className="hero-mockup">
            <div className="hero-mockup-sidebar">
              <div className="hero-mockup-avatar" />
              <div className="hero-mockup-line short" />
              <div className="hero-mockup-item active" />
              <div className="hero-mockup-item" />
              <div className="hero-mockup-item" />
              <div className="hero-mockup-item" />
            </div>
            <div className="hero-mockup-chat">
              <div className="hero-mockup-bubble left">실시간 채팅으로 바로 확인할게요 🙌</div>
              <div className="hero-mockup-bubble right">네, 스레드로 답장 남겨둘게요</div>
              <div className="hero-mockup-bubble left short">좋아요! 📌 고정해둘게요</div>
              <div className="hero-mockup-input" />
            </div>
          </div>
        </div>
      </header>

      <section className="landing-section">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">기능</span>
          <h2>일하는 방식 그대로, 기능으로 담았습니다</h2>
        </div>
        <div className="landing-feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <span className="landing-feature-icon">
                <Icon name={f.icon} size={20} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">시작하는 방법</span>
          <h2>3단계면 팀 전체가 대화를 시작할 수 있어요</h2>
        </div>
        <div className="landing-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="landing-step">
              <span className="landing-step-number">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">요금제</span>
          <h2>팀 규모에 맞춰 선택하세요</h2>
          <p className="landing-section-sub">아래 요금제는 예시이며, 실제 도입 문의는 별도로 받고 있어요.</p>
        </div>
        <div className="landing-pricing-grid">
          {PLANS.map((p) => (
            <div key={p.name} className={`landing-pricing-card ${p.highlight ? "highlight" : ""}`}>
              {p.highlight && <span className="landing-pricing-badge">가장 많이 선택</span>}
              <h3>{p.name}</h3>
              <div className="landing-pricing-price">{p.price}</div>
              <p className="landing-pricing-desc">{p.desc}</p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <Icon name="send" size={13} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={p.highlight ? "landing-cta-button" : "landing-secondary-button"}
                onClick={onGetStarted}
              >
                {p.price === "무료" ? "무료로 시작하기" : "문의하기"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <h2>지금 바로 팀과 함께 시작해보세요</h2>
        <p>가입은 1분이면 충분합니다.</p>
        <button className="landing-cta-button large" onClick={onGetStarted}>
          무료로 시작하기
        </button>
      </section>

      <footer className="landing-footer">
        <div className="landing-nav-brand">
          <BrandMark size={24} />
          <span>Messenger</span>
        </div>
        <p>팀의 대화와 근태를 한곳에 모은 실시간 사내 메신저</p>
      </footer>
    </div>
  );
}
