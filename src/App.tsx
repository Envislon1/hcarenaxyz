
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { VersionUpdatePrompt } from "@/components/VersionUpdatePrompt";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MatchesPage from "./pages/MatchesPage";
import ProfilePage from "./pages/ProfilePage";
import CreateMatchPage from "./pages/CreateMatchPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import GamePage from "./pages/GamePage";
import NotFound from "./pages/NotFound";
import { Layout } from "./components/Layout";
import WalletPage from "./pages/WalletPage";
import AdminRevenuePage from "./pages/AdminRevenuePage";
import AboutPage from "./pages/AboutPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";

const queryClient = new QueryClient();

const AppContent = () => {
  const { showUpdatePrompt, updateInfo, dismissUpdate } = useVersionCheck();

  return (
    <>
      <Toaster />
      <Sonner />
      {updateInfo && (
        <VersionUpdatePrompt
          open={showUpdatePrompt}
          platform={updateInfo.platform}
          version={updateInfo.version}
          downloadUrl={updateInfo.downloadUrl}
          onDismiss={dismissUpdate}
        />
      )}
      <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/create-match" element={<CreateMatchPage />} />
              <Route path="/game/:gameId" element={<GamePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/admin/revenue" element={<AdminRevenuePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
      </Router>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
