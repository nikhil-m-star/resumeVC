import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/AuthContext"
import AppLayout from "@/components/layout/AppLayout"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import Home from "@/pages/Home"
import Dashboard from "@/pages/Dashboard"
import Editor from "@/pages/Editor"
import Login from "@/pages/Login"
import Register from "@/pages/Register"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="resumevc-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard" />} />
            <Route path="*" element={<Navigate to="/" replace />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/editor" element={
                <ProtectedRoute>
                  <Editor />
                </ProtectedRoute>
              } />
              <Route path="/editor/demo" element={<Editor />} />
              <Route path="/editor/:id" element={
                <ProtectedRoute>
                  <Editor />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
