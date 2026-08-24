import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import AdminBar from './components/admin/AdminBar.jsx'
import Sidebar from './components/admin/Sidebar.jsx'
import { useAuth } from './lib/auth.jsx'
import { permissionForRoute } from './lib/nav.js'
import ChangePassword from './screens/ChangePassword.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Login from './screens/Login.jsx'
import NoAccess from './screens/NoAccess.jsx'
import NotBuiltYet from './screens/NotBuiltYet.jsx'
import Profile from './screens/Profile.jsx'
import AppearanceFooter from './screens/appearance/Footer.jsx'
import Menus from './screens/appearance/Menus.jsx'
import General from './screens/settings/General.jsx'
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
      <p className="subtitle">Loading…</p>
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
   * text me padha hai. Form se bane users pe koi gate nahi: unka password admin deta
   * hai aur wahi chalta hai (baad me wo Profile se khud badal sakte hain — D-37).
   *
   * Isliye ye screen kahin route pe nahi hai — sirf yahan se aati hai, aur ek hi baar.
   */
  if (user.mustChangePassword) return <ChangePassword forced />

  return children
}

/**
 * Permission ka **doosra** layer — screen render hi na ho (D-37).
 *
 * Asli rok server pe hai (`requirePermission()` har route pe). Ye uski jagah nahi
 * leta; ye sirf wo case sambhalta hai jahan bina permission wala user URL seedha type
 * kar deta hai. Bina iske screen render hoti, uski API call 403 khaati, aur user ko ek
 * khaali toota hua page dikhta — usse lagta CMS kharab hai, jabki rok sahi lagi thi.
 *
 * Sidebar se item chhupa dena akela kaafi **nahi** hai: wo sirf link hatata hai, raasta
 * nahi.
 */
function RequirePermission({ permission, children }) {
  const { can } = useAuth()

  if (permission && !can(permission)) return <NoAccess />

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

/**
 * Bani hui screens — path yahan, permission `lib/nav.js` me (D-37).
 *
 * Ye list data se isliye chalti hai ki path **ek hi baar** likha jaaye. Har route ko
 * haath se `<Route>` likhne par permission wahin inline aa jaati, aur phir sidebar aur
 * guard ke do alag sach ban jaate — theek wahi cheez jo D-37 rokta hai.
 *
 * `/profile` yahan hai par `ROUTE_GUARDS` me nahi — apni profile har role ki hai.
 * Isiliye wo `/users` ke andar bhi nahi rakhi gayi: `/users/*` pe `user.read` ka guard
 * lagta hai, aur profile ko usse chhoot deni padti — wo chhoot hi aage toot-ti.
 */
const APP_ROUTES = [
  { path: '/users', element: <UsersList /> },
  { path: '/users/new', element: <UserForm /> },
  { path: '/users/:id', element: <UserForm /> },
  { path: '/users/:id/delete', element: <DeleteUser /> },
  { path: '/profile', element: <Profile /> },
  { path: '/settings', element: <General /> },
  { path: '/appearance/menus', element: <Menus /> },
  { path: '/appearance/footer', element: <AppearanceFooter /> },
]

/** Har wo route jo sidebar me hai par abhi bana nahi. */
const PENDING_ROUTES = [
  { path: '/posts/*', title: 'Posts', phase: 'Phase 1' },
  { path: '/pages/*', title: 'Pages', phase: 'Phase 1' },
  { path: '/media/*', title: 'Media', phase: 'Phase 2' },
  { path: '/packages/*', title: 'Packages', phase: 'Phase 6' },
  { path: '/enquiries/*', title: 'Enquiries', phase: 'Phase 7b' },
  /**
   * Appearance ke bane hue do screens upar `APP_ROUTES` me hain. Ye splat sirf uske
   * andar ke baaki raaston ke liye hai — Homepage Blocks aur Banners & Sliders, jo abhi
   * sidebar me bhi nahi hain (`lib/nav.js`).
   */
  { path: '/appearance/*', title: 'Appearance', phase: 'Phase 5' },
  /**
   * `/settings` khud ab bana hua hai (upar `APP_ROUTES` me). Ye splat sirf uske andar
   * ke baaki screens ke liye hai — SEO, Email/SMTP, Integrations.
   *
   * React Router exact match ko splat se **upar** rakhta hai, isliye `/settings`
   * General pe hi jaata hai.
   */
  { path: '/settings/*', title: 'Settings', phase: 'a later phase' },
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

      {APP_ROUTES.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={
            <RequireAuth>
              <Shell>
                <RequirePermission permission={permissionForRoute(path)}>
                  {element}
                </RequirePermission>
              </Shell>
            </RequireAuth>
          }
        />
      ))}

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
              <NotBuiltYet title="Page not found" />
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
