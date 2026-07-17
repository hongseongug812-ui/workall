import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Main from "./pages/Main";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <p>불러오는 중...</p>
      </div>
    );
  }

  return user ? <Main /> : <Login />;
}
