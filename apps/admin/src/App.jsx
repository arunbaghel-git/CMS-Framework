import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import AdminBar from './components/admin/AdminBar.jsx'
import Sidebar from './components/admin/Sidebar.jsx'
import { useAuth } from './lib/auth.jsx'
import ChangePassword from './screens/ChangePassword.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Login from './screens/Login.jsx'
import NotBuiltYet from './screens/NotBuiltYet.jsx'
import DeleteUser from './screens/users/DeleteUser.jsx'
import UserForm from './screens/users/UserForm.jsx'
import UsersList from './screens/users/UsersList.jsx'

/**
 * Admin shell + routing.
 *
 * Layout `admin-design.html` se aata hai — wo FROZEN spec hai. Jo screens abhi nahi
 * bani, unke liye `NotBuiltYet` hai: route maujood hai, page saaf batata hai ki kaam
 * baaki hai (D-30).
 */

/** Sab jagah dikhne wala loading — session check hone tak. */
function Booting() {
  return (
    <div className="main">
      <p className="subtitle">Load ho raha hai…</p>
    </div>
  )
}

/**
 * Login zaroori. Bina session ke login pe bhejta hai — aur **yaad rakhta hai** ki
 * user kahan jaana chahta tha, taaki login ke baad wahin wapas jaaye.
 */
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Booting />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  /**
   * `mustChangePassword` ek **gate** hai, banner nahi.
   *
   * Ye sirf **seed se bane admin** pe lagta hai — uska password `.env` file me plain
   * text me padha hai. Form se bane users pe koi gate nahi (D-35): unka password admin
   * deta hai aur wahi chalta hai.
   *
   * Isliye ye screen kahin route pe nahi hai — sirf yahan se aati hai, aur ek hi baar.
   */
  if (user.mustChangePassword) return <ChangePassword forced />

  return children
}

/** Sidebar + admin bar wala layout. */
function Shell({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  /**
   * Collapse ka state `<body>` pe class se chalta hai — design ka CSS
   * (`body.collapsed .main`, `body.collapsed .sidebar`) usi par likha hai.
   */
  useEffect(() => {
    document.body.classList.toggle('collapsed', collapsed)
    return () => document.body.classList.remove('collapsed')
  }, [collapsed])

  return (
    <>
      <AdminBar />
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      <div className="main">{children}</div>
    </>
  )
}

/** Har wo route jo sidebar me hai par abhi bana nahi. */
const PENDING_ROUTES = [
  { path: '/posts/*', title: 'Posts', phase: 'Phase 1' },
  { path: '/pages/*', title: 'Pages', phase: 'Phase 1' },
  { path: '/media/*', title: 'Media', phase: 'Phase 2' },
  { path: '/packages/*', title: 'Packages', phase: 'Phase 6' },
  { path: '/enquiries/*', title: 'Enquiries', phase: 'Phase 7b' },
  { path: '/appearance/*', title: 'Appearance', phase: 'Slice 0 ke baad' },
  { path: '/settings/*', title: 'Settings', phase: 'Phase 0 ke agle step' },
]

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Shell>
              <Dashboard />
            </Shell>
          </RequireAuth>
        }
      />

      {/*
        Users ke routes. Har screen ke andar bhi permission check hai (buttons/actions),
        par asli rok server pe hai — `requirePermission()` har route pe.
      */}
      <Route
        path="/users"
        element={
          <RequireAuth>
            <Shell>
              <UsersList />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/users/new"
        element={
          <RequireAuth>
            <Shell>
              <UserForm />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/users/:id"
        element={
          <RequireAuth>
            <Shell>
              <UserForm />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/users/:id/delete"
        element={
          <RequireAuth>
            <Shell>
              <DeleteUser />
            </Shell>
          </RequireAuth>
        }
      />

      {PENDING_ROUTES.map(({ path, title, phase }) => (
        <Route
          key={path}
          path={path}
          element={
            <RequireAuth>
              <Shell>
                <NotBuiltYet title={title} phase={phase} />
              </Shell>
            </RequireAuth>
          }
        />
      ))}

      <Route
        path="*"
        element={
          <RequireAuth>
            <Shell>
              <NotBuiltYet title="Page nahi mila" />
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
