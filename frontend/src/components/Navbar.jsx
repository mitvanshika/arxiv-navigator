import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Navbar() {
  const location = useLocation()

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 px-8 py-4"
      style={{ background: 'rgba(4, 13, 26, 0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c050)', boxShadow: '0 0 15px rgba(201,168,76,0.4)' }}>
            <span className="text-navy-950 font-bold text-sm">Λ</span>
          </div>
          <span className="font-display font-semibold text-lg text-gradient-gold tracking-wide">
            ArXiv Navigator
          </span>
        </Link>

        <div className="flex items-center gap-8">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors duration-200 ${location.pathname === '/' ? 'text-gold-400' : 'text-gray-400 hover:text-gold-300'}`}
          >
            Home
          </Link>
          <Link
            to="/research"
            className={`text-sm font-medium transition-colors duration-200 ${location.pathname === '/research' ? 'text-gold-400' : 'text-gray-400 hover:text-gold-300'}`}
          >
            Research
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}