import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Users,
  BarChart3,
  FileText,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin-login');
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Insights', icon: BarChart3, path: '/admin/insights' },

    { label: 'Reports', icon: FileText, path: '/admin/reports' },
    { label: 'Outreach Records', icon: Globe, path: '/admin/outreach' },
    { label: 'Opportunities', icon: Users, path: '/admin/opportunities' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-72 bg-[#172554] border-r border-blue-800/50 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block shadow-2xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full bg-gradient-to-b from-[#172554] to-[#1e3a8a]">
          {/* Logo Section */}
          <div className="flex items-center gap-3 h-24 px-8 border-b border-blue-800/50 bg-[#172554]/50 backdrop-blur-md transition-all group/logo">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/30 group-hover/logo:scale-105 transition-transform">
              <BarChart3 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">Daru Rahma</h1>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1 block">Admin Portal</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                  <button
                    key={item.label}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "group flex items-start w-full px-5 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden",
                      isActive 
                        ? "bg-gradient-to-r from-brand-blue to-blue-600 text-white shadow-lg shadow-brand-blue/20 ring-1 ring-white/10" 
                        : "text-blue-200/70 hover:text-white hover:bg-blue-800/30"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeGlow"
                        className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none"
                      />
                    )}
                    <item.icon className={cn(
                      "w-5 h-5 mr-4 mt-0.5 transition-all group-hover:scale-110 shrink-0", 
                      isActive ? "text-white" : "text-blue-300/60 group-hover:text-white"
                    )} />
                    <span className={cn("font-medium tracking-wide text-[15px] text-left leading-tight", isActive ? "font-bold drop-shadow-sm" : "")}>{item.label}</span>
                  </button>
              );
            })}
          </nav>

          {/* User Section / Logout */}
          <div className="p-6 border-t border-blue-800/30 bg-blue-950/20">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-4 py-3 text-brand-blue rounded-xl bg-white hover:bg-red-50 transition-all duration-300 shadow-lg shadow-blue-950/50"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:text-red-500 transition-all">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-wide">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc]">
        {/* Top Header */}
        <header className="bg-white/70 backdrop-blur-xl h-24 flex items-center px-8 border-b border-slate-200/60 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-500 hover:text-brand-blue hover:bg-slate-100 rounded-xl transition-all mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex justify-end items-center gap-6">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-black text-slate-900 leading-none">Administrator</span>
                <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest mt-1">Super User</span>
              </div>
              <div className="relative group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-lightBlue p-0.5 shadow-lg shadow-brand-blue/20 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-brand-blue font-black text-lg">
                     A
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-green border-2 border-white rounded-full shadow-sm"></div>
              </div>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-all font-bold text-xs shadow-sm active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 md:p-10 lg:p-12">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
