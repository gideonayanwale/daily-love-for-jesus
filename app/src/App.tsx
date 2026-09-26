import { Routes, Route } from 'react-router'
import { lazy, Suspense } from 'react'
import AppLayout from './components/AppLayout'

const Home = lazy(() => import('./pages/Home'))
const Bible = lazy(() => import('./pages/Bible'))
const BibleChapter = lazy(() => import('./pages/BibleChapter'))
const BibleReader = lazy(() => import('./pages/BibleReader'))
const Hymns = lazy(() => import('./pages/Hymns'))
const HymnDetail = lazy(() => import('./pages/HymnDetail'))
const Devotionals = lazy(() => import('./pages/Devotionals'))
const DevotionalDetail = lazy(() => import('./pages/DevotionalDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const Community = lazy(() => import('./pages/Community'))
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Suspense fallback={<Loading />}><Home /></Suspense>} />
        <Route path="bible" element={<Suspense fallback={<Loading />}><Bible /></Suspense>} />
        <Route path="bible/:bookNumber" element={<Suspense fallback={<Loading />}><BibleChapter /></Suspense>} />
        <Route path="bible/:bookNumber/:chapter" element={<Suspense fallback={<Loading />}><BibleReader /></Suspense>} />
        <Route path="hymns" element={<Suspense fallback={<Loading />}><Hymns /></Suspense>} />
        <Route path="hymns/:id" element={<Suspense fallback={<Loading />}><HymnDetail /></Suspense>} />
        <Route path="devotionals" element={<Suspense fallback={<Loading />}><Devotionals /></Suspense>} />
        <Route path="devotionals/:id" element={<Suspense fallback={<Loading />}><DevotionalDetail /></Suspense>} />
        <Route path="community" element={<Suspense fallback={<Loading />}><Community /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<Loading />}><Settings /></Suspense>} />
      </Route>
      <Route path="/login" element={<Suspense fallback={<Loading />}><Login /></Suspense>} />
      <Route path="*" element={<Suspense fallback={<Loading />}><NotFound /></Suspense>} />
    </Routes>
  )
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-amber-700 text-sm">Loading...</p>
      </div>
    </div>
  )
}

export default App
