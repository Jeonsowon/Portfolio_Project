// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import FormPage from "./pages/FormPage";
import PreviewPage from "./pages/PreviewPage";
import HomePage from "./pages/HomePage";
import RemodelFormPage from "./pages/RemodelFormPage";
import PrivateRoute from "./router/PrivateRoute";
import { AuthProvider } from "./router/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/remodel/new" element={<RemodelFormPage />} />

          <Route
            path="/home"
            element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/form"
            element={
              <PrivateRoute>
                <FormPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/preview"
            element={
              <PrivateRoute>
                <PreviewPage />
              </PrivateRoute>
            }
          />
          {/* 공개 공유용 프리뷰 (비로그인 접근 허용) */}
          <Route path="/share/preview" element={<PreviewPage />} />
            <Route
            path="/remodel/new"
            element={
              <PrivateRoute>
                <RemodelFormPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}