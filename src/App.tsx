import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateTestAccounts from "./pages/CreateTestAccounts";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import Coding from "./pages/Coding";
import Tests from "./pages/Tests";
import Jobs from "./pages/Jobs";
import Attendance from "./pages/Attendance";
import Analytics from "./pages/Analytics";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminManageUsers from "./pages/admin/ManageUsers";
import ManageColleges from "./pages/superadmin/ManageColleges";
import ManageUsers from "./pages/superadmin/ManageUsers";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import ManageNotifications from "./pages/admin/ManageNotifications";
import ManageSections from "./pages/admin/ManageSections";
import ManageQuizzes from "./pages/faculty/ManageQuizzes";
import ManageAttendance from "./pages/faculty/ManageAttendance";
import ManageCodingProblems from "./pages/faculty/ManageCodingProblems";
import PlacementTraining from "./pages/student/PlacementTraining";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/create-test-accounts" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/create-test-accounts" element={<CreateTestAccounts />} />
          
          {/* Student Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/coding" element={<Coding />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/placement-training" element={<PlacementTraining />} />
          </Route>

          {/* Faculty Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/quizzes" element={<ManageQuizzes />} />
            <Route path="/faculty/attendance" element={<ManageAttendance />} />
            <Route path="/faculty/coding-problems" element={<ManageCodingProblems />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminManageUsers />} />
            <Route path="/admin/notifications" element={<ManageNotifications />} />
            <Route path="/admin/sections" element={<ManageSections />} />
          </Route>

          {/* Super Admin Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/colleges" element={<ManageColleges />} />
            <Route path="/superadmin/users" element={<ManageUsers />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
