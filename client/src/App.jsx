import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Websites from './pages/Websites'
import WebsiteDetail from './pages/WebsiteDetail'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import Reports from './pages/Reports'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard"        element={<Dashboard />} />
            <Route path="/users"            element={<Users />} />
            <Route path="/websites"         element={<Websites />} />
            <Route path="/websites/:id"     element={<WebsiteDetail />} />
            <Route path="/tasks"            element={<Tasks />} />
            <Route path="/tasks/:id"        element={<TaskDetail />} />
            <Route path="/reports"          element={<Reports />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
