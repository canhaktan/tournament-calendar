import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import YearView from './components/YearView'
import CalculateNormPage from './components/CalculateNormPage'

import ComingSoon from './components/ComingSoon';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<YearView />} />
          <Route path="/norm" element={<CalculateNormPage />} />
          <Route path="/coming-soon" element={<ComingSoon
            title="Design Preview"
            description="This is a preview of the coming soon component."
          />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
