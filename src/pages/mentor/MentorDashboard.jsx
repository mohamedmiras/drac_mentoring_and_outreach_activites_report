import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, UserCircle, Users, BarChart3, Settings,
  Target, Trophy, Star, ArrowRight, Eye, PlusCircle, MessageSquare,
  Download, Image as ImageIcon, KeyRound, Bell, Search, LayoutDashboard, PieChart, Camera, BookOpen, ArrowLeft, Activity
} from 'lucide-react';
import { processAndUploadImage } from '../../lib/imageOptimization';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import MeetingRecords from './components/MeetingRecords';
import MentorChangePasswordModal from './components/MentorChangePasswordModal';
import StudentSpiritualActivities from './components/StudentSpiritualActivities';
import StudentAcademicTasks from './components/StudentAcademicTasks';
import SpiritualInsights from './components/SpiritualInsights';
import AcademicInsights from './components/AcademicInsights';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const nicknameMap = {
  "Usthad Yasir Hudawi": "Yasir Hudawi",
  "Usthad Thoyyib Hudawi": "Thoyyib Hudawi",
  "Usthad Rafi Hudawi": "Rafi Hudawi",
  "Usthad Zakariya Hudawi": "Zakariya Hudawi",
  "Usthad Numan Hudawi": "Numan Hudawi",
  "Usthad Muhsin MC Hudawi": "Muhsin Hudawi",
  "Usthad Anver Sadiq Hudawi": "Anver Hudawi",
  "Usthad Abu Shammas Rafeeq Faisy": "Rafeeq Faisy",
  "Usthad Salman Hudawi": "Salman Hudawi"
};

const getShortClass = (name) => {
  if (!name) return '-';
  const n = name.toLowerCase();
  if (n.includes('secondary final')) return 'S5';
  if (n.includes('senior secondary 1')) return 'SS1';
  if (n.includes('senior secondary 2')) return 'SS2';
  if (n.includes('degree 1st')) return 'D1';
  if (n.includes('degree 2nd')) return 'D2';
  if (n.includes('degree 3rd')) return 'D3';
  return name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().substring(0, 3);
};

const getNickname = (fullName) => {
  return nicknameMap[fullName] || fullName;
};

const MentorDashboard = () => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || sessionStorage.getItem('mentorActiveTab') || 'hub');
  const [mentees, setMentees] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalCampusScore, setGlobalCampusScore] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [updatingCover, setUpdatingCover] = useState(false);
  const [spiritualMentee, setSpiritualMentee] = useState(null);
  const [academicMentee, setAcademicMentee] = useState(null);
  const [insightTab, setInsightTab] = useState('spiritual');
  const [mentorMetrics, setMentorMetrics] = useState({ avgSpiritual: 0, avgAcademic: 0 });

  const handleUpdateProfilePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file || !mentorProfile.id) return;
    setUpdatingPhoto(true);
    try {
      const photoURL = await processAndUploadImage(file, 'profile');
      await updateDoc(doc(db, 'mentors', mentorProfile.id), { photoURL });
      setMentorProfile(prev => ({ ...prev, photoURL }));
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to update profile photo");
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleUpdateCoverPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file || !mentorProfile.id) return;
    setUpdatingCover(true);
    try {
      const coverURL = await processAndUploadImage(file, 'cover');
      await updateDoc(doc(db, 'mentors', mentorProfile.id), { coverURL });
      setMentorProfile(prev => ({ ...prev, coverURL }));
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to update cover photo");
    } finally {
      setUpdatingCover(false);
    }
  };



  useEffect(() => {
    sessionStorage.setItem('mentorActiveTab', activeTab);
  }, [activeTab]);

  const [mentorProfile, setMentorProfile] = useState({
    name: userData?.name || 'Mentor',
    username: userData?.username || '',
    photoURL: '',
    coverURL: '',
    caption: 'Inspiring excellence and shaping the future'
  });

  useEffect(() => {
    fetchMentorData();
  }, [userData]);

  const fetchMentorData = async () => {
    setLoading(true);
    try {
      if (userData?.username) {
        const mentorDoc = await getDocs(query(collection(db, 'mentors'), where('username', '==', userData.username)));
        if (!mentorDoc.empty) {
          const docRef = mentorDoc.docs[0];
          const data = docRef.data();
          setMentorProfile(prev => ({ ...prev, id: docRef.id, ...data }));
        }
      }

      const q = query(collection(db, 'students'), where('mentorUsername', '==', userData?.username || ''));
      const menteeSnap = await getDocs(q);
      const menteeData = [];
      const menteeIds = [];

      menteeSnap.forEach(d => {
        const s = d.data();
        menteeData.push({ id: d.id, ...s });
        menteeIds.push(d.id);
      });

      // Calculate global campus score
      const allStudentsSnap = await getDocs(collection(db, 'students'));
      let globalScore = 0;
      allStudentsSnap.forEach(doc => {
        globalScore += (doc.data().netScore || 0);
      });
      setGlobalCampusScore(globalScore);

      setMentees(menteeData.sort((a, b) => (b.netScore || 0) - (a.netScore || 0)));

      if (menteeIds.length > 0) {
        const achData = [];
        const allAchSnap = await getDocs(collection(db, 'achievements'));
        allAchSnap.forEach(d => {
          const ach = { id: d.id, ...d.data() };
          if (menteeIds.includes(ach.studentId)) {
            achData.push(ach);
          }
        });
        setAchievements(achData);

        // Fetch Spiritual Data
        const spiritualSnap = await getDocs(collection(db, 'spiritual_records'));
        const spiritualRecords = [];
        spiritualSnap.forEach(d => {
          const data = d.data();
          if (menteeIds.includes(data.studentId)) spiritualRecords.push(data);
        });

        let avgSpiritual = 0;
        if (spiritualRecords.length > 0) {
          const studentAverages = {};
          spiritualRecords.forEach(rec => {
            if (!studentAverages[rec.studentId]) studentAverages[rec.studentId] = { total: 0, count: 0 };
            studentAverages[rec.studentId].total += Number(rec.overallScore) || 0;
            studentAverages[rec.studentId].count += 1;
          });
          const scores = Object.values(studentAverages).map(s => s.total / s.count);
          avgSpiritual = scores.reduce((a, b) => a + b, 0) / scores.length;
        }

        // Fetch Academic Data
        const academicTasksSnap = await getDocs(collection(db, 'academic_tasks'));
        const academicRecordsSnap = await getDocs(collection(db, 'academic_records'));
        const academicTasks = [];
        const academicRecords = [];
        
        academicTasksSnap.forEach(d => {
          const data = d.data();
          if (menteeIds.includes(data.studentId)) academicTasks.push({ id: d.id, ...data });
        });
        academicRecordsSnap.forEach(d => {
          const data = d.data();
          if (menteeIds.includes(data.studentId)) academicRecords.push(data);
        });

        let avgAcademic = 0;
        if (academicTasks.length > 0) {
          const studentScores = {};
          academicTasks.forEach(task => {
            const taskRecords = academicRecords.filter(r => r.taskId === task.id);
            if (taskRecords.length === 0) return;
            let totalCompleted = 0;
            let expectedTotal = taskRecords.length * task.targetCount;
            taskRecords.forEach(r => totalCompleted += r.completedCount);
            let completionPercent = expectedTotal > 0 ? Math.min(100, Math.round((totalCompleted / expectedTotal) * 100)) : 0;
            
            if (!studentScores[task.studentId]) studentScores[task.studentId] = { totalPercent: 0, count: 0 };
            studentScores[task.studentId].totalPercent += completionPercent;
            studentScores[task.studentId].count += 1;
          });
          
          let totalGlobalPercent = 0;
          let studentCountWithTasks = 0;
          Object.values(studentScores).forEach(s => {
            totalGlobalPercent += Math.round(s.totalPercent / s.count);
            studentCountWithTasks++;
          });
          avgAcademic = studentCountWithTasks > 0 ? (totalGlobalPercent / studentCountWithTasks) : 0;
        }

        setMentorMetrics({ avgSpiritual, avgAcademic });

      } else {
        setAchievements([]);
        setMentorMetrics({ avgSpiritual: 0, avgAcademic: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/mentor');
  };

  const totalNetScore = mentees.reduce((acc, m) => acc + (m.netScore || 0), 0);
  const campusShare = globalCampusScore > 0 ? ((totalNetScore / globalCampusScore) * 100).toFixed(1) : 0;
  const totalOutreach = achievements.filter(a => a.isOutreach).length;
  
  const avgNetScore = mentees.length > 0 ? (totalNetScore / mentees.length) : 0;
  
  // Calculate Meeting Points (1 attendance = 3 points)
  const totalMeetingsAttendances = mentees.reduce((acc, m) => acc + (m.meetingsCount || 0), 0);
  const meetingPoints = totalMeetingsAttendances * 3;

  // Formula: 40% NetScore, 20% Spiritual, 20% Academic, and Meeting Points directly added.
  const rawMentoringScore = (avgNetScore * 0.40) + (mentorMetrics.avgSpiritual * 0.20) + (mentorMetrics.avgAcademic * 0.20) + meetingPoints;
  const mentoringScore = rawMentoringScore % 1 === 0 ? rawMentoringScore : rawMentoringScore.toFixed(2);
  
  const topMentees = [...mentees].slice(0, 3);
  const filteredMentees = mentees.filter(m => m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()));

  const tabs = [
    { id: 'hub', label: 'Overview', icon: LayoutDashboard },
    { id: 'mentees', label: 'Mentees Hub', icon: Users },
    { id: 'meetings', label: 'Meeting Records', icon: Target },
    { id: 'insights', label: 'Academic/Spiritual', icon: BarChart3 }
  ];

  if (loading && mentees.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500 font-bold tracking-tight">Syncing Mentor Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-inter pb-16 md:pb-0">
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#172554] border-t border-blue-800/50 z-50 flex items-center justify-around px-2 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (activeTab === tab.id) {
                setAcademicMentee(null);
                setSpiritualMentee(null);
              } else {
                setActiveTab(tab.id);
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all rounded-lg",
              activeTab === tab.id ? "bg-blue-800/40 text-white" : "text-blue-300/50"
            )}
          >
            <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-blue-200" : "")} />
            <span className="text-[8px] font-bold uppercase tracking-tight">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#172554] border-r border-blue-800/50 hidden md:block sticky top-0 h-screen z-30 shrink-0 shadow-2xl">
        <div className="flex flex-col h-full bg-gradient-to-b from-[#172554] to-[#1e3a8a]">
          <div className="flex items-center gap-3 h-24 px-6 border-b border-blue-800/50 bg-[#172554]/50 backdrop-blur-md transition-all group/logo">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/30 border border-white/10 group-hover/logo:scale-105 transition-transform">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-white leading-none">Mentor<span className="text-blue-300">Hub</span></h1>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1 block">Mentor Portal</span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-2 relative z-10">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "group flex items-center w-full px-5 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden",
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-brand-blue to-blue-600 text-white shadow-lg shadow-brand-blue/20 ring-1 ring-white/10"
                    : "text-blue-200/70 hover:text-white hover:bg-blue-800/30"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none"
                  />
                )}
                <tab.icon className={cn("w-5 h-5 mr-4 transition-all group-hover:scale-110 shrink-0", activeTab === tab.id ? "text-white" : "text-blue-300/60 group-hover:text-white")} />
                <span className={cn("font-medium tracking-wide text-[15px] text-left leading-tight", activeTab === tab.id ? "font-bold drop-shadow-sm" : "")}>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-blue-800/30 bg-blue-950/20 relative z-10">
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Top Navbar */}
        <header className="h-16 bg-amber-50 border-b border-amber-100 sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
             <button 
               onClick={handleLogout}
               className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 shadow-sm font-bold text-[10px] active:scale-95 transition-all"
             >
               <LogOut className="w-3.5 h-3.5" />
               <span>Log out</span>
             </button>
             <div className="hidden sm:block">
                <h2 className="text-sm font-bold text-black">Hi, {getNickname(mentorProfile.name)}</h2>
                <p className="text-xs text-gray-500 font-medium">{mentorProfile.caption}</p>
             </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-1.5 bg-white border border-amber-200 rounded-lg text-sm text-black placeholder:text-amber-300 focus:ring-2 focus:ring-amber-100 outline-none w-48 transition-all focus:w-64" 
              />
            </div>
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-amber-100 text-black rounded-lg text-xs font-bold transition-all border border-amber-200 shadow-sm"
              title="Change Password"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Change Password</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center overflow-hidden">
               {mentorProfile.photoURL ? <img src={mentorProfile.photoURL} alt="" className="w-full h-full object-cover" /> : <UserCircle className="w-5 h-5 text-amber-200" />}
            </div>
          </div>
        </header>


        {/* Dashboard Content */}
        <main className="flex-1 p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              {activeTab === 'hub' && (
                <div className="space-y-8">
                  {/* Executive Hero */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-gradient-to-r from-brand-blue to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-brand-blue/10 flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-6"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                    <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white/10 shadow-2xl overflow-hidden bg-white/5 backdrop-blur-sm group/avatar shrink-0">
                      {updatingPhoto && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                      {mentorProfile.photoURL ? (
                        <img src={mentorProfile.photoURL} alt={mentorProfile.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50 bg-black/20">
                          <UserCircle className="w-14 h-14 sm:w-16 sm:h-16" />
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer z-10">
                        <Camera className="w-8 h-8 text-white" />
                        <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={handleUpdateProfilePhoto} disabled={updatingPhoto} />
                      </label>
                    </div>

                    <div className="relative z-10 max-w-2xl text-center sm:text-left">
                      <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                        className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-2"
                      >
                        Welcome, {getNickname(mentorProfile.name)}
                      </motion.h2>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="text-blue-100/90 text-xs sm:text-sm md:text-base font-medium space-y-1"
                      >
                        <p>Have a look at your mentees' performance achievements,</p>
                        <p>they show an inspiring and brighter future!</p>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Colored KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-violet-50/60 p-5 rounded-2xl border border-violet-100 shadow-sm hover:shadow-md hover:bg-violet-50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-xs font-bold text-violet-600/80 uppercase tracking-widest">Campus Share</p>
                        <div className="p-2 bg-violet-100 rounded-lg group-hover:scale-110 group-hover:bg-violet-200 transition-all">
                          <PieChart className="w-4 h-4 text-violet-600" />
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-violet-900">{campusShare}%</h3>
                    </div>

                    <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md hover:bg-blue-50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-bold text-blue-600/80 uppercase tracking-widest">Net Score</p>
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 group-hover:bg-blue-200 transition-all">
                          <Target className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-blue-900">{totalNetScore}</h3>
                    </div>

                    <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md hover:bg-emerald-50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">Outreach</p>
                        <div className="p-2 bg-emerald-100 rounded-lg group-hover:scale-110 group-hover:bg-emerald-200 transition-all">
                          <Trophy className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-emerald-900">{totalOutreach}</h3>
                    </div>

                    <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md hover:bg-amber-50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-bold text-amber-600/80 uppercase tracking-widest">Mentor Rating</p>
                        <div className="p-2 bg-amber-100 rounded-lg group-hover:scale-110 group-hover:bg-amber-200 transition-all">
                          <Star className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-amber-900">{mentoringScore}</h3>
                    </div>
                  </div>

                  {/* Best Mentees Grid */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing Mentees</h3>
                    {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {topMentees.length > 0 ? topMentees.map((mentee, idx) => (
                          <div key={mentee.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 hover:shadow-md transition-all">
                            <div className="relative mb-3">
                              <div className="w-16 h-16 bg-gray-50 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden">
                                {mentee.photoURL ? <img src={mentee.photoURL} alt="" className="w-full h-full object-cover" /> : <UserCircle className="w-8 h-8 text-gray-300" />}
                              </div>
                              <div className="absolute -bottom-2 right-0 w-6 h-6 bg-slate-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                #{idx + 1}
                              </div>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{mentee.fullName}</h4>
                            <p className="text-xs text-gray-500 font-medium mb-3">{mentee.className}</p>
                            <div className="bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
                              <span className="text-sm font-black text-brand-blue">{mentee.netScore || 0} pts</span>
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-3 p-10 bg-white border border-gray-200 border-dashed rounded-xl text-center text-sm text-gray-500 font-medium">
                            No performance data available yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'mentees' && (
                <div className="space-y-6">
                  {academicMentee ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 sm:p-6">
                      <button 
                        onClick={() => setAcademicMentee(null)} 
                        className="mb-6 flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition shadow-sm gap-3 active:scale-95"
                      >
                        <ArrowLeft className="w-5 h-5" /> Back to Mentee List
                      </button>
                      <StudentAcademicTasks student={academicMentee} />
                    </div>
                  ) : spiritualMentee ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 sm:p-6">
                      <button 
                        onClick={() => setSpiritualMentee(null)} 
                        className="mb-6 flex items-center text-sm font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 hover:bg-amber-100 transition shadow-sm gap-3 active:scale-95"
                      >
                        <ArrowLeft className="w-5 h-5" /> Back to Mentee List
                      </button>
                      <StudentSpiritualActivities student={spiritualMentee} />
                    </div>
                  ) : (
                    <>
                      {/* Mentees Cover Photo Area */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="relative w-full h-40 sm:h-56 rounded-2xl overflow-hidden shadow-sm group/cover flex shrink-0 border border-gray-200 bg-gray-50"
                        style={mentorProfile.coverURL ? { backgroundImage: `url(${mentorProfile.coverURL})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                      >
                        {!mentorProfile.coverURL && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-400 font-medium">Add a cover photo with your mentees</p>
                            </div>
                          </div>
                        )}

                        {mentorProfile.coverURL && <div className="absolute inset-0 bg-slate-900/10"></div>}

                        <label className="absolute top-4 right-4 z-20 p-2 sm:px-3 sm:py-2 bg-white/80 hover:bg-white backdrop-blur-md rounded-lg text-gray-700 cursor-pointer transition-all flex items-center gap-2 opacity-0 group-hover/cover:opacity-100 shadow-sm border border-gray-200">
                          {updatingCover ? <div className="w-4 h-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div> : <Camera className="w-4 h-4 text-gray-500" />}
                          <span className="text-xs font-bold hidden sm:inline">Change Cover</span>
                          <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={handleUpdateCoverPhoto} disabled={updatingCover} />
                        </label>
                      </motion.div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">Mentees Hub</h2>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">Comprehensive view of assigned students.</p>
                    </div>
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search mentees..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none w-full sm:w-64 transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <th className="p-4 pl-6 font-semibold">Student Name</th>
                            <th className="p-4 font-semibold">Class & Roll</th>
                            <th className="p-4 text-center font-semibold">Net Score</th>
                            <th className="p-4 text-center font-semibold">Rating</th>
                            <th className="p-4 pr-6 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {loading ? (
                            [1, 2, 3, 4].map(i => (
                              <tr key={i}>
                                <td colSpan="5" className="p-4"><div className="h-10 bg-slate-100 animate-pulse rounded-lg"></div></td>
                              </tr>
                            ))
                          ) : filteredMentees.length > 0 ? filteredMentees.map(mentee => (
                            <tr key={mentee.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="p-4 pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {mentee.photoURL ? <img src={mentee.photoURL} alt="" className="w-full h-full object-cover" /> : <UserCircle className="w-4 h-4 text-gray-400" />}
                                  </div>
                                  <span className="font-semibold text-gray-900 text-sm">{mentee.fullName}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <p className="font-bold text-gray-700 text-sm">{getShortClass(mentee.className)}</p>
                              </td>
                              <td className="p-4 text-center">
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  {mentee.netScore || 0}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[13px] font-bold text-gray-700">{mentee.totalStars || 0}</span>
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                </div>
                              </td>
                              <td className="p-4 pr-6">
                                <div className="flex items-center justify-end gap-2.5 transition-all">
                                  <button onClick={() => setAcademicMentee(mentee)} className="p-2 text-gray-500 hover:text-indigo-600 bg-gray-50/50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-100 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95" title="Academic Tasks">
                                    <BookOpen className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setSpiritualMentee(mentee)} className="p-2 text-gray-500 hover:text-amber-600 bg-gray-50/50 hover:bg-amber-50 border border-gray-100 hover:border-amber-100 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95" title="Spiritual Activities">
                                    <Activity className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => navigate(`/mentor/mentee/${mentee.id}`, { state: { student: mentee } })} className="p-2 text-gray-500 hover:text-brand-blue bg-gray-50/50 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95" title="View Profile">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="5" className="p-12 text-center text-gray-400 font-medium italic">No mentees found matching your search.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="sm:hidden divide-y divide-gray-100">
                      {loading ? (
                        [1, 2, 3].map(i => (
                          <div key={i} className="p-4"><div className="h-16 bg-slate-100 animate-pulse rounded-xl"></div></div>
                        ))
                      ) : filteredMentees.length > 0 ? filteredMentees.map(mentee => {
                        const getShortClass = (name) => {
                          if (!name) return '-';
                          const n = name.toLowerCase();
                          if (n.includes('secondary final')) return 'S5';
                          if (n.includes('senior secondary 1')) return 'SS1';
                          if (n.includes('senior secondary 2')) return 'SS2';
                          if (n.includes('degree 1st')) return 'D1';
                          if (n.includes('degree 2nd')) return 'D2';
                          if (n.includes('degree 3rd')) return 'D3';
                          return name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().substring(0, 3);
                        };
                        return (
                          <div key={mentee.id} className="p-3 flex items-center justify-between gap-2 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                {mentee.photoURL ? <img src={mentee.photoURL} alt="" className="w-full h-full object-cover" /> : <UserCircle className="w-5 h-5 text-gray-400" />}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-medium text-gray-900 text-[11px] truncate leading-tight mb-0.5">{mentee.fullName}</h3>
                                <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-extrabold uppercase tracking-tight">
                                  <span className="bg-gray-100 px-1 py-0.5 rounded">{getShortClass(mentee.className)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right flex flex-col items-end">
                                <div className="px-1.5 py-0.5 bg-blue-50 text-[#172554] border border-blue-100/50 rounded text-[8px] font-medium mb-0.5">
                                  {mentee.netScore || 0} Pts
                                </div>
                                <div className="flex items-center gap-0.5 text-gray-500 text-[8px] font-normal">
                                  <span>{mentee.totalStars || 0}</span>
                                  <Star className="w-2 h-2 fill-amber-300 text-amber-300" />
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => setAcademicMentee(mentee)} 
                                  className="w-8 h-8 flex items-center justify-center text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg active:scale-90 transition-transform"
                                  title="Academic"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setSpiritualMentee(mentee)} 
                                  className="w-8 h-8 flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-100 rounded-lg active:scale-90 transition-transform"
                                  title="Spiritual"
                                >
                                  <Activity className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => navigate(`/mentor/mentee/${mentee.id}`, { state: { student: mentee } })} 
                                  className="w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-100 rounded-lg active:scale-90 transition-transform"
                                  title="View Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="p-8 text-center text-gray-400 text-sm italic">No mentees found.</div>
                      )}
                    </div>
                  </div>
                  </>
                  )}
                </div>
              )}

              {activeTab === 'meetings' && (
                <MeetingRecords mentees={mentees} mentorProfile={mentorProfile} />
              )}

              {activeTab === 'insights' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-900">Insights & Reports</h2>
                      <p className="text-sm text-gray-500 font-medium mt-1">Data-driven analysis of your mentoring portfolio.</p>
                    </div>
                    
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                      <button 
                        onClick={() => setInsightTab('academic')}
                        className={cn(
                          "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                          insightTab === 'academic' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        Academic
                      </button>
                      <button 
                        onClick={() => setInsightTab('spiritual')}
                        className={cn(
                          "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                          insightTab === 'spiritual' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        Spiritual
                      </button>
                    </div>
                  </div>

                  {insightTab === 'spiritual' ? (
                    <SpiritualInsights mentees={mentees} />
                  ) : (
                    <AcademicInsights mentees={mentees} />
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">Profile Settings</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage your executive profile preferences.</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-8">

                    <div>
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Identity</h3>
                      <div className="flex gap-4">
                        <button className="flex-1 bg-white border border-gray-200 hover:border-brand-blue hover:shadow-sm text-gray-600 rounded-lg p-4 flex items-center justify-center gap-2 transition-all">
                          <UserCircle className="w-5 h-5" />
                          <span className="text-sm font-semibold">Change Avatar</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Account Details</h3>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Official Name</label>
                        <input type="text" value={mentorProfile.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm text-gray-800 font-medium" readOnly />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display Caption</label>
                        <input type="text" value={mentorProfile.caption} className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue rounded-lg outline-none text-sm text-gray-800 font-medium transition-all" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Security</h3>
                      <button className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition-colors group">
                        <div className="flex items-center gap-3">
                          <KeyRound className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold text-gray-700 text-sm">Update Password</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MentorChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        username={userData?.username}
      />
    </div>

  );
};

export default MentorDashboard;
