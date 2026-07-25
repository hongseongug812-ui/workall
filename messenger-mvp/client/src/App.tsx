import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Main from "./pages/Main";
import ResetPassword from "./pages/ResetPassword";

type GuestView = "landing" | "auth";

function getResetTokenFromUrl() {
  return new URLSearchParams(window.location.search).get("resetToken");
}

export default function App() {
  const { user, loading } = useAuth();
  const [guestView, setGuestView] = useState<GuestView>("landing");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [resetToken, setResetToken] = useState<string | null>(getResetTokenFromUrl);

  if (resetToken) {
    return (
      <ResetPassword
        token={resetToken}
        onDone={() => {
          window.history.replaceState(null, "", window.location.pathname);
          setResetToken(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="auth-screen">
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (user) return <Main />;

  if (guestView === "landing") {
    return (
      <Landing
        onGetStarted={() => {
          setAuthMode("register");
          setGuestView("auth");
        }}
        onLogin={() => {
          setAuthMode("login");
          setGuestView("auth");
        }}
      />
    );
  }

  return <Login initialMode={authMode} onBack={() => setGuestView("landing")} />;
}
