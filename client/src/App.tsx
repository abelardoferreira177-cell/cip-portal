import { Route, Routes, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import PublicSearch from "./pages/PublicSearch";
import VerifyPage from "./pages/VerifyPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<PublicSearch />} />
        <Route path="/verificar/:code" element={<VerifyPage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/painel" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
