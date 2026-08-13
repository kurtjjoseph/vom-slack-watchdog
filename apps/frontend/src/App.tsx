import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AnomalyDetail from './pages/AnomalyDetail';
import Patterns from './pages/Patterns';
import Settings from './pages/Settings';
import Login from './pages/Login';

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/anomalies/:id" element={<AnomalyDetail />} />
        <Route path="/patterns" element={<Patterns />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;
