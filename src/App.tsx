import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { isAuthenticated, isDemoMode } from "./lib/api";
import Home from "./pages/Home";
import Planner from "./pages/Planner";
import Analytics from "./pages/Analytics";
import SmartSchedule from "./pages/SmartSchedule";
import Vocabulary from "./pages/Vocabulary";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ShellSync } from "./pwa/ShellSync";

const queryClient = new QueryClient();

// Wrapper that renders children inside AppLayout with auth protection
function LayoutWrapper() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <ThemeProvider>
    <ShellSync />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <Routes>
          {/* Login — redirect to dashboard if already logged in or in demo mode */}
          <Route path="/login" element={
            (isAuthenticated() || isDemoMode()) ? <Navigate to="/" replace /> : <Login />
          } />

          {/* App pages — with sidebar, protected by auth or demo mode */}
          <Route element={<LayoutWrapper />}>
            <Route path="/" element={<Home />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/schedule" element={<SmartSchedule />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
