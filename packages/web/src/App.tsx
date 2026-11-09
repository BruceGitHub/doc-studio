import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { HomePage } from './pages/HomePage'
import { ProjectPage } from './pages/ProjectPage'
import { DocPage } from './pages/DocPage'
import { SearchPage } from './pages/SearchPage'
import { DoctorPage } from './pages/DoctorPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="p/:project" element={<ProjectPage />} />
        <Route path="doc/*" element={<DocPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="doctor" element={<DoctorPage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}
