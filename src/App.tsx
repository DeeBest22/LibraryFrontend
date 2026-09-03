import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Catalogue from './pages/Catalogue';
import MyBooks from './pages/MyBooks';
import AdminBooks from './pages/AdminBooks';
import AdminMembers from './pages/AdminMembers';
import AdminTransactions from './pages/AdminTransactions';
import AdminReports from './pages/AdminReports';
import NotFound from './pages/NotFound';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import LogoutCallbackPage from './pages/LogoutCallbackPage';
// MODULE_IMPORTS_START
// MODULE_IMPORTS_END

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const AppRoutes = () => (
  <Routes>
    {/* Public (Guest) */}
    <Route path="/" element={<Index />} />
    <Route path="/about" element={<About />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/* Standard user (protected, role=USER) */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/catalogue" element={<Catalogue />} />
    <Route path="/my-books" element={<MyBooks />} />

    {/* Administrator (protected, role=ADMIN) */}
    <Route path="/admin/books" element={<AdminBooks />} />
    <Route path="/admin/members" element={<AdminMembers />} />
    <Route path="/admin/transactions" element={<AdminTransactions />} />
    <Route path="/admin/reports" element={<AdminReports />} />

    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/auth/error" element={<AuthError />} />
    <Route path="/logout-callback" element={<LogoutCallbackPage />} />
    {/* MODULE_ROUTES_START */}
    {/* MODULE_ROUTES_END */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* MODULE_PROVIDERS_START */}
    {/* MODULE_PROVIDERS_END */}
    <TooltipProvider>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
    {/* MODULE_PROVIDERS_CLOSE */}
  </QueryClientProvider>
);

export default App;
export { AppRoutes };