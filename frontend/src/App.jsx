import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ResearchPage from './pages/ResearchPage'
import Navbar from './components/Navbar'
import StarField from './components/StarField'

export default function App() {
  return (
    <div className="min-h-screen bg-navy-950 relative">
      <StarField />
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/research" element={<ResearchPage />} />
      </Routes>
    </div>
  )
}