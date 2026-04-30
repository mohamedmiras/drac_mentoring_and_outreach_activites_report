import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Landing from './pages/Landing';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ClassView from './pages/admin/ClassView';
import StudentAdminProfile from './pages/admin/StudentAdminProfile';
import StudentPortal from './pages/student/StudentLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import GlobalInsights from './pages/admin/GlobalInsights';
import Reports from './pages/admin/Reports';
import Opportunities from './pages/admin/Opportunities';
import OutreachRecords from './pages/admin/OutreachRecords';
import AdminMentors from './pages/admin/AdminMentors';

import MentorLogin from './pages/mentor/MentorLogin';
import MentorDashboard from './pages/mentor/MentorDashboard';
import MentorStudentProfile from './pages/mentor/MentorStudentProfile';

const ProtectedAdminRoute = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
    </div>
  );
  if (!currentUser || userData?.role !== 'admin') {
    return <Navigate to="/admin-login" />;
  }
  return children;
};

const ProtectedStudentRoute = ({ children }) => {
  const { userData, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-green"></div>
    </div>
  );
  if (userData?.role !== 'student') {
    return <Navigate to="/student" />;
  }
  return children;
};

const ProtectedMentorRoute = ({ children }) => {
  const { userData, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
    </div>
  );
  if (userData?.role !== 'mentor') {
    return <Navigate to="/mentor" />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Admin Routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/class/:className" element={
            <ProtectedAdminRoute>
              <ClassView />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/student/:studentId" element={
            <ProtectedAdminRoute>
              <StudentAdminProfile />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/insights" element={
            <ProtectedAdminRoute>
              <GlobalInsights />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedAdminRoute>
              <Reports />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/outreach" element={
            <ProtectedAdminRoute>
              <OutreachRecords />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/mentors" element={
            <ProtectedAdminRoute>
              <AdminMentors />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/opportunities" element={
            <ProtectedAdminRoute>
              <Opportunities />
            </ProtectedAdminRoute>
          } />

          {/* Student Routes */}
          <Route path="/student" element={<StudentPortal />} />
          <Route path="/student/dashboard" element={
            <ProtectedStudentRoute>
              <StudentDashboard />
            </ProtectedStudentRoute>
          } />

          {/* Mentor Routes */}
          <Route path="/mentor" element={<MentorLogin />} />
          <Route path="/mentor/dashboard" element={
            <ProtectedMentorRoute>
              <MentorDashboard />
            </ProtectedMentorRoute>
          } />
          <Route path="/mentor/mentee/:studentId" element={
            <ProtectedMentorRoute>
              <MentorStudentProfile />
            </ProtectedMentorRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
