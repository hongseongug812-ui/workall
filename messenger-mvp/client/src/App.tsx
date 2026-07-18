import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Main from "./pages/Main";

type GuestView = "landing" | "auth";

export default function App() {
  const { user, loading } = useAuth();
  const [guestView, setGuestView] = useState<GuestView>("landing");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

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
