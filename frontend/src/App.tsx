import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Workflows from './pages/Workflows';
import Tools from './pages/Tools';
import Memory from './pages/Memory';
import Audit from './pages/Audit';
import SecurityPage from './pages/Security';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<Agents />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="tools" element={<Tools />} />
        <Route path="memory" element={<Memory />} />
        <Route path="audit" element={<Audit />} />
        <Route path="security" element={<SecurityPage />} />
      </Route>
    </Routes>
  );
}
