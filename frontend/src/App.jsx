import { useState } from 'react'
import TradingDashboard from './components/TradingDashboard'
import ConfigurationPanel from './components/ConfigurationPanel'
import { Settings, BarChart3 } from 'lucide-react'
import './App.css'

/**
 * Main Application Component
 * Professional trading dashboard for crypto bot
 */
function App() {
  const [currentView, setCurrentView] = useState('dashboard')

  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="app-nav">
        <div className="app-nav-brand">
          <BarChart3 size={24} />
          <span>Crypto Trading Bot</span>
        </div>
        <div className="app-nav-tabs">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`app-nav-tab ${currentView === 'dashboard' ? 'active' : ''}`}
          >
            <BarChart3 size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('config')}
            className={`app-nav-tab ${currentView === 'config' ? 'active' : ''}`}
          >
            <Settings size={18} />
            Configurações
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="app-content">
        {currentView === 'dashboard' ? <TradingDashboard /> : <ConfigurationPanel />}
      </div>
    </div>
  )
}

export default App
