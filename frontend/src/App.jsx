import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from './services/supabase.js'
import useAuthStore from './store/authStore.js'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'

import LoginPage          from './pages/LoginPage.jsx'
import RegisterPage       from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage  from './pages/ResetPasswordPage.jsx'
import DashboardPage   from './pages/DashboardPage.jsx'
import NewProjectPage  from './pages/NewProjectPage.jsx'
import ProjectPage     from './pages/ProjectPage.jsx'
import BriefPage       from './pages/BriefPage.jsx'
import PlanPage        from './pages/PlanPage.jsx'
import EditorPage      from './pages/EditorPage.jsx'
import BrandVoicesPage from './pages/BrandVoicesPage.jsx'
import ExportPage      from './pages/ExportPage.jsx'

export default function App() {
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  return (
    <Routes>
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/register"        element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"           element={<DashboardPage />} />
        <Route path="/projects/new"        element={<NewProjectPage />} />
        <Route path="/projects/:id"        element={<ProjectPage />} />
        <Route path="/projects/:id/brief"  element={<BriefPage />} />
        <Route path="/projects/:id/plan"   element={<PlanPage />} />
        <Route path="/projects/:id/editor" element={<EditorPage />} />
        <Route path="/projects/:id/export" element={<ExportPage />} />
        <Route path="/brand-voices"        element={<BrandVoicesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
