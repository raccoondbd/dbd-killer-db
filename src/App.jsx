import { BrowserRouter, Routes, Route, HashRouter } from 'react-router-dom';
import TopPage from './pages/TopPage';
import KillerPage from './pages/KillerPage';
import CommonGuidePage from './pages/CommonGuidePage';
import CreatorsPage from './pages/CreatorsPage';
import UsefulSitesPage from './pages/UsefulSitesPage';
import AdminPage from './pages/AdminPage';
import ScrollToTop from './components/ScrollToTop';
import GoogleAnalytics from './components/GoogleAnalytics';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <HashRouter>
      <GoogleAnalytics />
      <ScrollToTop />
      <div className="app-container">
        <Routes>
          <Route path="/" element={<TopPage />} />
          <Route path="/killer/:id" element={<KillerPage />} />
          <Route path="/common-guide/:type" element={<CommonGuidePage />} />
          <Route path="/creators" element={<CreatorsPage />} />
          <Route path="/useful-sites" element={<UsefulSitesPage />} />
          <Route path="/admin-secret" element={<AdminPage />} />
        </Routes>
        <Footer />
      </div>
    </HashRouter>
  );
}

export default App;
