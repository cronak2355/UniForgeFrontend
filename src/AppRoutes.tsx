import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OAuthCallback from './pages/OAuthCallback';
import MainPage from './pages/MainPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import CreateAssetPage from './pages/CreateAssetPage';
import MarketplacePage from './pages/MarketplacePage';
import ExplorePage from './pages/ExplorePage';
import LibraryPage from './pages/LibraryPage';
import AdminPage from './pages/AdminPage';
import SimpleGame from './pages/SimpleGame';
import Loading from './components/common/Loading';
import { useAuth } from './contexts/AuthContext';
import "./App.css";
import EditorLayout from "./editor/EditorLayout";
import BuildPage from "./pages/BuildPage";
import ProjectsPage from "./pages/ProjectsPage";
import { AssetsEditorPage } from './AssetsEditor';
import AppLayout from './components/layout/AppLayout';
import AdminRoute from './components/auth/AdminRoute';

function AppRoutes() {
    const { isAuthenticated, isLoading } = useAuth();
    console.log("deploy test")
    if (isLoading) {
        return <Loading />;
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={isAuthenticated ? <Navigate to="/main" replace /> : <LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* Authenticated Routes with AppLayout (Sidebar persists) */}
            <Route path="/main" element={isAuthenticated ? <AppLayout><MainPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/projects" element={isAuthenticated ? <AppLayout><ProjectsPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/explore" element={isAuthenticated ? <AppLayout><ExplorePage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/assets" element={isAuthenticated ? <AppLayout><AssetsPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/assets/:assetId" element={isAuthenticated ? <AppLayout><AssetDetailPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/create-asset" element={isAuthenticated ? <AppLayout><CreateAssetPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/marketplace" element={isAuthenticated ? <AppLayout><MarketplacePage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/library" element={isAuthenticated ? <Navigate to="/library/assets" replace /> : <Navigate to="/auth" replace />} />
            <Route path="/library/:type" element={isAuthenticated ? <AppLayout><LibraryPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/admin" element={isAuthenticated ? <AdminRoute><AppLayout><AdminPage /></AppLayout></AdminRoute> : <Navigate to="/auth" replace />} />
            <Route path="/build" element={isAuthenticated ? <AppLayout><BuildPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/assets-editor" element={isAuthenticated ? <AssetsEditorPage /> : <Navigate to="/auth" replace />} />

            {/* Full-screen Editor Routes (no sidebar) */}
            <Route path="/editor" element={isAuthenticated ? <EditorLayout /> : <Navigate to="/auth" replace />} />
            <Route path="/editor/:gameId" element={isAuthenticated ? <EditorLayout /> : <Navigate to="/auth" replace />} />
            {/* Play Mode Route */}
            <Route path="/play" element={isAuthenticated ? <EditorLayout isPlayMode={true} /> : <Navigate to="/auth" replace />} />
            <Route path="/play/:gameId" element={isAuthenticated ? <EditorLayout isPlayMode={true} /> : <Navigate to="/auth" replace />} />

            {/* Simple Game Demo */}
            <Route path="/simple-game" element={<SimpleGame />} />
        </Routes>
    );
}

export default AppRoutes;
