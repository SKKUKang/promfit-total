import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/home';
import Library from './pages/library';
import LoginPage from './pages/LoginPage'; // 아까 만든 로그인 전용 페이지


function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/library" element={<Library />} />
      
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
