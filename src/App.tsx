import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewAgent from './pages/NewAgent'
import InboxDetail from './pages/InboxDetail'
import Playground from './pages/Playground'
import PublicActivity from './pages/PublicActivity'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/agents/new" element={<NewAgent />} />
        <Route path="/app/inbox/:id" element={<InboxDetail />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/v/:owner" element={<PublicActivity />} />
        <Route path="*" element={<div className="container-page py-24"><h1 className="h1">Page not found</h1></div>} />
      </Route>
    </Routes>
  )
}
