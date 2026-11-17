import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Loading } from './components/ui';
import { useProfile } from './db/hooks';
import Body from './pages/Body';
import Onboarding from './pages/Onboarding';
import Plan from './pages/Plan';
import Running from './pages/Running';
import Session from './pages/Session';
import Settings from './pages/Settings';
import Today from './pages/Today';

// HashRouter: as rotas ficam depois do "#", então o GitHub Pages nunca dá 404 ao recarregar.
export default function App() {
  const profile = useProfile();

  if (profile === undefined) return <Loading />;

  if (profile === null) {
    return (
      <HashRouter>
        <Routes>
          <Route path="*" element={<Onboarding />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/treino" element={<Session />} />
        <Route path="/treino/:workoutId" element={<Session />} />
        <Route path="/plano" element={<Plan />} />
        <Route path="/corpo" element={<Body />} />
        <Route path="/corrida" element={profile.runningEnabled ? <Running /> : <Navigate to="/ajustes" replace />} />
        <Route path="/ajustes" element={<Settings />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Nav />
    </HashRouter>
  );
}
