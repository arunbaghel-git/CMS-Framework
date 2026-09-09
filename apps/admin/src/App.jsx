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
import SidebarEdit from './screens/appearance/SidebarEdit.jsx'
import Sidebars from './screens/appearance/Sidebars.jsx'
import BulkUpload from './screens/bulk-upload/BulkUpload.jsx'
import BulkUploadRun from './screens/bulk-upload/BulkUploadRun.jsx'
import EnquiriesList from './screens/enquiries/EnquiriesList.jsx'
import EnquiryDetail from './screens/enquiries/EnquiryDetail.jsx'
import FormBuilder from './screens/forms/FormBuilder.jsx'
import MediaLibrary from './screens/media/MediaLibrary.jsx'
import FormsList from './screens/forms/FormsList.jsx'
import MasterListScreen from './screens/packages/MasterListScreen.jsx'
import ItinerarySettings from './screens/packages/ItinerarySettings.jsx'
import PackageDefaults from './screens/packages/PackageDefaults.jsx'
import PackageEdit from './screens/packages/PackageEdit.jsx'
import TaxonomyScreen from './screens/packages/TaxonomyScreen.jsx'
import PackagesList from './screens/packages/PackagesList.jsx'
import PageEdit from './screens/pages/PageEdit.jsx'
import BlogPageList from './screens/pages/BlogPageList.jsx'
import PostList from './screens/pages/PostList.jsx'
import TourList from './screens/pages/TourList.jsx'
import CtaSection from './screens/settings/CtaSection.jsx'
import General from './screens/settings/General.jsx'
import BlogSettings from './screens/settings/BlogSettings.jsx'
import TourSettings from './screens/settings/TourSettings.jsx'
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
  { path: '/tour', element: <TourList /> },
  { path: '/tour/new', element: <PageEdit /> },
  /**
   * ⚠️ `/tour/:id` se **pehle** — React Router static segment ko waise bhi upar rakhta hai, par
   * kram me saaf likha hona is baat ko padhne wale ke liye bhi saaf rakhta hai.
   *
   * Ye pehle `/settings/tour` tha; 8 Sep ko client ne ise Tour ke submenu me bhej diya.
   */
  { path: '/tour/settings', element: <TourSettings /> },
  { path: '/tour/:id', element: <PageEdit /> },

  /**
   * Posts aur Blog Page — blog (spec 008, Slice C).
   *
   * ⚠️ **Teenon screens `NotBuiltYet` se yahan aayi hain** (A-9 ka `post` wala aadha).
   * `page` **jaan-boojh kar chhoda gaya hai** — 8 Sep ka sabak: _"Pages par kaam to ho hi
   * nahi raha"_. Blog ka matlab `post` hai, aur scope ek faisle se nahi badhta.
   *
   * `/posts/new` `/posts/:id` se **pehle** — wahi kram jo `/packages` pe hai, taaki padhne
   * wale ko ye na sochna pade ki "new" kahin ek id ki tarah to nahi jaa raha.
   */
  { path: '/posts', element: <PostList /> },
  { path: '/posts/new', element: <PageEdit type="post" /> },
  {
    path: '/posts/categories',
    element: (
      <TaxonomyScreen
        type="category"
        title="Category"
        subtitle="Flat list — the topic shown on each post card, and in the blog sidebar."
      />
    ),
  },
  { path: '/posts/:id', element: <PageEdit type="post" /> },

  { path: '/blog-page', element: <BlogPageList /> },
  { path: '/blog-page/new', element: <PageEdit type="blogPage" /> },
  { path: '/blog-page/:id', element: <PageEdit type="blogPage" /> },
  { path: '/packages', element: <PackagesList /> },
  /**
   * `/packages/new` `/packages/:id` se **pehle** hai.
   *
   * React Router ka ranking waise bhi static segment ko dynamic se upar rakhta hai, par
   * order yahan bhi wahi rakha gaya hai — list padhne wale ko ye sochna na pade ki "new"
   * kahin ek id ki tarah to nahi padha ja raha.
   */
  { path: '/packages/new', element: <PackageEdit /> },
  {
    path: '/packages/destinations',
    element: (
      <TaxonomyScreen
        type="destination"
        title="Destination"
        subtitle="Hierarchical taxonomy shared by Posts and Packages."
        hierarchical
        hasBanner
      />
    ),
  },
  {
    path: '/packages/types',
    element: (
      <TaxonomyScreen
        type="packageType"
        title="Package Type"
        subtitle="Flat list — Honeymoon, Adventure, Family. Shown as the 'Theme' column in the packages list."
      />
    ),
  },
  { path: '/packages/hotels', element: <MasterListScreen list="hotels" /> },
  { path: '/packages/add-ons', element: <MasterListScreen list="addOns" /> },
  { path: '/packages/transfers', element: <MasterListScreen list="transfers" /> },
  /**
   * `/reviews` — `/packages/reviews` **nahi** (client, 1 Sep). Reviews ka apna top-level
   * menu hai, isliye uska apna top-level path bhi.
   *
   * Iska ek chhupa hua faayda bhi hai: `/packages/*` wala "abhi nahi bana" splat neeche
   * hai, aur us raaste se nikal jaane ka matlab hai ki koi galti se wo splat pakde hi na.
   */
  { path: '/reviews', element: <MasterListScreen list="reviews" /> },

  /**
   * ⚠️ `/enquiries/forms/new` `/enquiries/forms/:id` se **pehle** hai — wahi wajah jo
   * `/packages/new` pe likhi hai: warna `new` ek form ki id samajh li jaati aur screen
   * "Form not found" pe khulti.
   */
  /** Media Library — Phase 2 ka bacha hua hissa, client ne 3 Sep ko maanga (D-78). */
  { path: '/media', element: <MediaLibrary /> },

  /** Bulk Upload — list, phir ek run ka nateeja. Static segment pehle (D-81). */
  { path: '/bulk-upload', element: <BulkUpload /> },
  { path: '/bulk-upload/:id', element: <BulkUploadRun /> },

  { path: '/enquiries', element: <EnquiriesList /> },
  { path: '/enquiries/forms', element: <FormsList /> },
  { path: '/enquiries/forms/new', element: <FormBuilder /> },
  { path: '/enquiries/forms/:id', element: <FormBuilder /> },
  /**
   * ⚠️ `/enquiries/:id` **`forms` waalon ke baad** — warna `forms` ek enquiry ki id samajh
   * liya jaata aur Enquiry Forms ki screen "Enquiry not found" pe khulti. Wahi kram jo
   * `/packages/:id` pe hai.
   */
  { path: '/enquiries/:id', element: <EnquiryDetail /> },
  { path: '/packages/whats-included', element: <PackageDefaults section="whatsIncluded" /> },
  { path: '/packages/itinerary-images', element: <PackageDefaults section="itineraryImages" /> },
  { path: '/packages/section-headings', element: <PackageDefaults section="sectionLabels" /> },
  { path: '/packages/itinerary-settings', element: <ItinerarySettings /> },
  /**
   * `/packages/:id` sabse **aakhir** me — warna wo `destinations`, `hotels` jaise har
   * static segment ko ek entry id ki tarah padh leta.
   */
  { path: '/packages/:id', element: <PackageEdit /> },
  { path: '/users', element: <UsersList /> },
  { path: '/users/new', element: <UserForm /> },
  { path: '/users/:id', element: <UserForm /> },
  { path: '/users/:id/delete', element: <DeleteUser /> },
  { path: '/profile', element: <Profile /> },
  { path: '/settings', element: <General /> },
  { path: '/settings/cta', element: <CtaSection /> },
  /** Blog settings — author · TOC · post ki sidebar (spec 008, Slice C). */
  { path: '/settings/blog', element: <BlogSettings /> },
  { path: '/appearance/menus', element: <Menus /> },
  { path: '/appearance/sidebars', element: <Sidebars /> },
  { path: '/appearance/sidebars/:id', element: <SidebarEdit /> },
  { path: '/appearance/footer', element: <AppearanceFooter /> },
]

/** Har wo route jo sidebar me hai par abhi bana nahi. */
const PENDING_ROUTES = [
  /**
   * ~~Posts ka splat~~ — **9 Sep ko hat gaya** (spec 008, Slice C). All Posts, Add New,
   * Categories aur Blog Page — chaaron upar `APP_ROUTES` me hain. `Tags` bana hi nahi, aur
   * na banega: client ne use mana kiya aur `post.taxonomyTypes` se bhi wo hat chuka hai.
   */
  /**
   * Pages — D-87 me **scope me thi hi nahi**. Slice C me ye screens galti se ban gayi thin
   * (kaam Tour ka tha), aur client ne 8 Sep ko wo pakda: _"Pages par kaam to ho hi nahi raha"_.
   *
   * Screens ka code git me hai (commit 1e7688d) aur unka saancha bhi bacha hua hai —
   * `EntriesList.jsx` aur `PageEdit.jsx` dono type se chalte hain. Jis din Pages ka kaam
   * aayega, wo do route jodne ka kaam hai (A-9).
   */
  { path: '/pages/*', title: 'Pages', phase: 'Phase 1' },
  /**
   * Packages ke bane hue teen screens upar `APP_ROUTES` me hain. Ye splat sirf uske andar
   * ke baaki raaston ke liye hai — Destinations, Package Type, Hotels, Add Ons, Transfer,
   * What's Included aur Itinerary Images. Unka **API ban chuka hai** (Slice 2); sirf screens
   * baaki hain.
   */
  { path: '/packages/*', title: 'Packages', phase: 'Slice 2 ki screens' },
  /**
   * ~~Enquiries ka splat~~ — **3 Sep ko hat gaya.** Inbox ki teenon screens ban chuki hain
   * (All Enquiries, Enquiry Detail, aur Export CSV jo list ke upar wala button hai), aur
   * Enquiry Forms pehle se thi. Ab is section me "abhi nahi bana" jaisa kuch bacha hi nahi.
   */
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
