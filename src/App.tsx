import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Reception from "./pages/Reception";
import Workshop from "./pages/Workshop";
import HomePage from "./pages/Home";
import ServiceJob from "./pages/ServiceJob";
import BikeDetail from "./pages/BikeDetail";
import HistoryPage from "./pages/History";
import Admin from "./pages/Admin";
import RetentionEngine from "./pages/RetentionEngine";
import LoginScreen from "./pages/LoginScreen"; // [NEW]
import { Button } from "@/components/ui/button";
import { Home, ClipboardList, Settings, Wrench, History, Bell, LogOut } from "lucide-react";

const queryClient = new QueryClient();

import { migrateServiceIds, migrateClientIds } from "@/lib/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Run Data Migration & Check Auth on Startup
  useEffect(() => {
    migrateServiceIds();
    migrateClientIds();

    // Check Auth
    const auth = localStorage.getItem("probikes_auth");
    const user = localStorage.getItem("currentUser");

    if (auth === "true") {
      setIsAuthenticated(true);
      if (user) setCurrentUser(user);
    }
  }, []);

  const handleLogin = (username: string) => {
    localStorage.setItem("probikes_auth", "true");
    localStorage.setItem("currentUser", username);
    setCurrentUser(username);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("probikes_auth");
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">

          {/* Sidebar / Navigation */}
          <nav className="w-full md:w-20 border-r border-border bg-card flex md:flex-col items-center py-4 space-x-4 md:space-x-0 md:space-y-8 sticky top-0 z-10 h-16 md:h-screen justify-center md:justify-start">
            <div className="hidden md:block mb-4 text-center">
              <img src="/img/logo_icon.png" alt="ProBikes" className="h-12 w-auto mx-auto" />
              {currentUser && <div className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-widest">{currentUser}</div>}
            </div>

            <div className="flex-1 flex md:flex-col items-center space-x-4 md:space-x-0 md:space-y-8 justify-center md:justify-start">
              <Link to="/">
                <NavButton icon={<Home />} label="Inicio" />
              </Link>
              <Link to="/reception">
                <NavButton icon={<ClipboardList />} label="Recepción" />
              </Link>
              <Link to="/workshop">
                <NavButton icon={<Wrench />} label="Taller" />
              </Link>
              <Link to="/history">
                <NavButton icon={<History />} label="Historial" />
              </Link>
              <Link to="/reminders">
                <NavButton icon={<Bell />} label="Motor Retención" />
              </Link>
              <Link to="/admin">
                <NavButton icon={<Settings />} label="Admin" />
              </Link>
            </div>

            {/* Logout Button */}
            <div className="md:mt-auto md:pb-8">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full"
                title="Cerrar Sesión"
                onClick={handleLogout}
              >
                <LogOut size={20} />
              </Button>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/reception" element={<Reception />} />
              <Route path="/workshop" element={<Workshop />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/reminders" element={<RetentionEngine />} />
              <Route path="/bikes/:id" element={<BikeDetail />} />
              <Route path="/clients/:clientId" element={<BikeDetail />} />
              <Route path="/service/:id" element={<ServiceJob />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function NavButton({ icon, label }: { icon: any, label: string }) {
  return (
    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10" title={label}>
      {icon}
    </Button>
  )
}

export default App
