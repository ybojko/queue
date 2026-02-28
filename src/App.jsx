import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import QueuePage from './pages/QueuePage';
import AdminPage from './pages/AdminPage';
import { ADMIN_PATH } from './config';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QueuePage />} />
        <Route path={ADMIN_PATH} element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
