import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'

import { MobileSubmitPage } from './pages/MobileSubmitPage'
import { PcWallPage } from './pages/PcWallPage'

function App() {
  const nav = useNavigate()
  const loc = useLocation()

  // If user lands on "/", auto route by screen size.
  // Mobile -> /m, Desktop -> /pc
  if (loc.pathname === '/') {
    const isMobile = window.matchMedia?.('(max-width: 720px)')?.matches ?? false
    return <Navigate to={isMobile ? '/m' : '/pc'} replace />
  }

  return (
    <>
      <Routes>
        <Route path="/m" element={<MobileSubmitPage />} />
        <Route path="/pc" element={<PcWallPage onGoMobile={() => nav('/m')} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
