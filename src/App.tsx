import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import App from "./pages/App";
import DocumentList from "./pages/DocumentList";
import DocumentEditor from "./pages/DocumentEditor";
import DocumentViewer from "./pages/DocumentViewer";
import DocumentUpload from "./pages/DocumentUpload";
import ClientDashboard from "./pages/ClientDashboard";
import ReviewerDashboard from "./pages/ReviewerDashboard";
import ReviewerDocumentView from "./pages/ReviewerDocumentView";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import UserSettings from "./pages/UserSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoot = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/app" 
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app/documents" 
              element={
                <ProtectedRoute>
                  <DocumentList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app/documents/new" 
              element={
                <ProtectedRoute>
                  <DocumentEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app/documents/:documentId/edit" 
              element={
                <ProtectedRoute>
                  <DocumentEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app/upload" 
              element={
                <ProtectedRoute>
                  <DocumentUpload />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app/dashboard" 
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app/documents/:id" 
              element={
                <ProtectedRoute>
                  <DocumentViewer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app/documents/:documentId/view" 
              element={
                <ProtectedRoute>
                  <DocumentViewer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reviewer/dashboard" 
              element={
                <ProtectedRoute requiredRole="legal_reviewer">
                  <ReviewerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reviewer/documents/:documentId" 
              element={
                <ProtectedRoute requiredRole="legal_reviewer">
                  <ReviewerDocumentView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/audit-logs" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAuditLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app/settings" 
              element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default AppRoot;
