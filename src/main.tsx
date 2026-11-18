import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { History, MatchDetail } from './pages/History'
import { Home } from './pages/Home'
import { NewMatch } from './pages/NewMatch'
import { Players } from './pages/Players'
import { Scoreboard } from './pages/Scoreboard'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewMatch />} />
        <Route path="/match/:id" element={<Scoreboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<MatchDetail />} />
        <Route path="/players" element={<Players />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
