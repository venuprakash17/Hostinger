import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";
import { AnnouncementPopup } from "./components/AnnouncementPopup";
import { CodingFiltersProvider } from "./contexts/CodingFiltersContext";

// Lazy load pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Resume = lazy(() => import("./pages/Resume"));
const Coding = lazy(() => import("./pages/Coding"));
const CodingProblemsList = lazy(() => import("./pages/CodingProblemsList"));
const Tests = lazy(() => import("./pages/Tests"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Attendance = lazy(() => import("./pages/Attendance"));
const AttendanceAnalytics = lazy(() => import("./pages/AttendanceAnalytics"));
const Analytics = lazy(() => import("./pages/Analytics"));
const FacultyDashboard = lazy(() => import("./pages/faculty/FacultyDashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const ManageStaff = lazy(() => import("./pages/admin/ManageStaff"));
const AdminManageJobs = lazy(() => import("./pages/admin/ManageJobs"));
const ManageDepartments = lazy(() => import("./pages/admin/ManageDepartments"));
const ManageSubjects = lazy(() => import("./pages/admin/ManageSubjects"));
const ManageColleges = lazy(() => import("./pages/superadmin/ManageColleges"));
const ManageUsers = lazy(() => import("./pages/superadmin/ManageUsers"));
const AllStudents = lazy(() => import("./pages/superadmin/AllStudents"));
const ManageCompanies = lazy(() => import("./pages/superadmin/ManageCompanies"));
const ManageGlobalContent = lazy(() => import("./pages/superadmin/ManageGlobalContent"));
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/SuperAdminDashboard"));
const SuperAdminManageJobs = lazy(() => import("./pages/superadmin/ManageJobs"));
const ManageNotifications = lazy(() => import("./pages/admin/ManageNotifications"));
const ManageSections = lazy(() => import("./pages/admin/ManageSections"));
const ManageQuizzes = lazy(() => import("./pages/faculty/ManageQuizzes"));
const ManageAttendance = lazy(() => import("./pages/faculty/ManageAttendance"));
const ManageCodingProblems = lazy(() => import("./pages/faculty/ManageCodingProblems"));
const PlacementTraining = lazy(() => import("./pages/student/PlacementTraining"));
const TrainingSessions = lazy(() => import("./pages/student/TrainingSessions"));
const ApplicationTracker = lazy(() => import("./pages/ApplicationTracker"));
const Certificates = lazy(() => import("./pages/Certificates"));
const ReviewCertificates = lazy(() => import("./pages/admin/ReviewCertificates"));
const MockInterviews = lazy(() => import("./pages/MockInterviews"));
const ManageMockInterviews = lazy(() => import("./pages/admin/ManageMockInterviews"));
const HallTickets = lazy(() => import("./pages/HallTickets"));
const SuperAdminPromotions = lazy(() => import("./pages/superadmin/Promotions"));
const ManageAnnouncements = lazy(() => import("./pages/superadmin/ManageAnnouncements"));
const JobAggregation = lazy(() => import("./pages/admin/JobAggregation"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LabList = lazy(() => import("./pages/coding-labs/LabList"));
const LabDetail = lazy(() => import("./pages/coding-labs/LabDetail"));
const LabBuilder = lazy(() => import("./pages/coding-labs/LabBuilder"));
const LabMonitor = lazy(() => import("./pages/coding-labs/LabMonitor"));
const ProctoringViolations = lazy(() => import("./pages/coding-labs/ProctoringViolations"));
const MyLabs = lazy(() => import("./pages/faculty/MyLabs"));
const LabAttendance = lazy(() => import("./pages/faculty/LabAttendance"));
const StudentLabDashboard = lazy(() => import("./pages/intelligent-labs/StudentLabDashboard"));
const FacultySessionPlanner = lazy(() => import("./pages/intelligent-labs/FacultySessionPlanner"));

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      cacheTime: 10 * 60 * 1000, // 10 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
    },
  },
});

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AnnouncementPopup />
          <CodingFiltersProvider>
            <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route 
              path="/login" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Login />
                </Suspense>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Signup />
                </Suspense>
              } 
            />
            
            {/* Student Routes */}
            <Route element={<DashboardLayout />}>
            <Route 
              path="/profile" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Profile />
                </Suspense>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/resume" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Resume />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-problems" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <CodingProblemsList />
                </Suspense>
              } 
            />
            <Route 
              path="/coding" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Coding />
                </Suspense>
              } 
            />
            <Route 
              path="/tests" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Tests />
                </Suspense>
              } 
            />
            <Route 
              path="/jobs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Jobs />
                </Suspense>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Attendance />
                </Suspense>
              } 
            />
            <Route 
              path="/attendance-analytics" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <AttendanceAnalytics />
                </Suspense>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Analytics />
                </Suspense>
              } 
            />
            <Route 
              path="/training-sessions" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <TrainingSessions />
                </Suspense>
              } 
            />
            <Route 
              path="/placement-training" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <PlacementTraining />
                </Suspense>
              } 
            />
            <Route 
              path="/applications" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ApplicationTracker />
                </Suspense>
              } 
            />
            <Route 
              path="/certificates" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Certificates />
                </Suspense>
              } 
            />
            <Route 
              path="/mock-interviews" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <MockInterviews />
                </Suspense>
              } 
            />
            <Route 
              path="/hall-tickets" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <HallTickets />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabList />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabDetail />
                </Suspense>
              } 
            />
          </Route>

          {/* Faculty Routes */}
          <Route element={<DashboardLayout />}>
            <Route 
              path="/faculty/dashboard" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <FacultyDashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/faculty/quizzes" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageQuizzes />
                </Suspense>
              } 
            />
            <Route 
              path="/faculty/attendance" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageAttendance />
                </Suspense>
              } 
            />
            <Route 
              path="/faculty/coding-problems" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageCodingProblems />
                </Suspense>
              } 
            />
            <Route 
              path="/faculty/my-labs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <MyLabs />
                </Suspense>
              } 
            />
            <Route 
              path="/faculty/labs/:id/attendance" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabAttendance />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabList />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/new" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabBuilder />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id/build" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabBuilder />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id/monitor" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabMonitor />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id/violations" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProctoringViolations />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabDetail />
                </Suspense>
              } 
            />
          </Route>

          {/* Admin Routes */}
          <Route element={<DashboardLayout />}>
            <Route 
              path="/admin/dashboard" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminDashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminManageUsers />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/staff" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageStaff />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/departments" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageDepartments />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/subjects" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageSubjects />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/jobs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminManageJobs />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/notifications" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageNotifications />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/certificates" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ReviewCertificates />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/mock-interviews" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageMockInterviews />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/job-aggregation" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <JobAggregation />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/sections" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageSections />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabList />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/new" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabBuilder />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id/build" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabBuilder />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id/monitor" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabMonitor />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabDetail />
                </Suspense>
              } 
            />
          </Route>

          {/* Super Admin Routes */}
          <Route element={<DashboardLayout />}>
            <Route 
              path="/superadmin/dashboard" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <SuperAdminDashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/superadmin/colleges" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageColleges />
                </Suspense>
              } 
            />
            <Route 
              path="/superadmin/users" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageUsers />
                </Suspense>
              }
            />
            <Route 
              path="/superadmin/all-students" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <AllStudents />
                </Suspense>
              }
            />
            <Route 
              path="/superadmin/global-content" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageGlobalContent />
                </Suspense>
              } 
            />
            <Route 
              path="/superadmin/jobs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <SuperAdminManageJobs />
                </Suspense>
              } 
            />
            <Route 
              path="/superadmin/companies" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageCompanies />
                </Suspense>
              } 
            />
            <Route 
              path="/superadmin/promotions" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <SuperAdminPromotions />
                </Suspense>
              } 
            />
            <Route 
              path="/superadmin/announcements" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManageAnnouncements />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabList />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/new" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabBuilder />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id/build" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabBuilder />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id/monitor" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabMonitor />
                </Suspense>
              } 
            />
            <Route 
              path="/coding-labs/:id" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LabDetail />
                </Suspense>
              }
            />
            <Route 
              path="/intelligent-labs/:labId/dashboard" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <StudentLabDashboard />
                </Suspense>
              }
            />
            <Route 
              path="/intelligent-labs/:labId/planner" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <FacultySessionPlanner />
                </Suspense>
              }
            />
          </Route>
          
          <Route
            path="*" 
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFound />
              </Suspense>
            } 
          />
        </Routes>
      </CodingFiltersProvider>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
