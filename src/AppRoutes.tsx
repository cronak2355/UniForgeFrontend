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
import Loading from './components/common/Loading';
import { useAuth } from './contexts/AuthContext';
import "./App.css";
import EditorLayout from "./editor/EditorLayout";
import BuildPage from "./pages/BuildPage";
import { AssetsEditorPage } from './AssetsEditor';

function AppRoutes() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <Loading />;
    }
    console.log("skkrrrr")
    return (
        <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/main" replace /> : <LandingPage />} />
            <Route path="/main" element={isAuthenticated ? <MainPage /> : <Navigate to="/auth" replace />} />
            <Route path="/explore" element={isAuthenticated ? <ExplorePage /> : <Navigate to="/auth" replace />} />
            <Route path="/assets" element={isAuthenticated ? <AssetsPage /> : <Navigate to="/auth" replace />} />
            <Route path="/assets/:assetId" element={isAuthenticated ? <AssetDetailPage /> : <Navigate to="/auth" replace />} />
            <Route path="/create-asset" element={isAuthenticated ? <CreateAssetPage /> : <Navigate to="/auth" replace />} />
            <Route path="/marketplace" element={isAuthenticated ? <MarketplacePage /> : <Navigate to="/auth" replace />} />
            <Route path="/library" element={isAuthenticated ? <LibraryPage /> : <Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/editor" element={isAuthenticated ? <EditorLayout /> : <Navigate to="/auth" replace />} />
            <Route path="/editor/:gameId" element={isAuthenticated ? <EditorLayout /> : <Navigate to="/auth" replace />} />
            <Route path="/build" element={isAuthenticated ? <BuildPage /> : <Navigate to="/auth" replace />} />
            <Route path="/assets-editor" element={isAuthenticated ? <AssetsEditorPage /> : <Navigate to="/auth" replace />} />

            {/* <Route path="/editor" element={isAuthenticated ? <EditorLayout /> : <EditorLayout /><Navigate to="/auth" replace /> } /> */}
        </Routes>
    );
}


export default AppRoutes;
