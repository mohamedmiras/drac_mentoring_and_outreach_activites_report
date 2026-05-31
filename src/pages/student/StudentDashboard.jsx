import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Trophy, Star, TrendingUp, Calendar, ArrowRight, Target, Award, Search, LogOut, CheckCircle, Activity, LayoutDashboard, KeyRound, Menu, X, PlusCircle, User, LogOut as LogOutIcon, Key, Globe, PieChart, Pencil, Download, BookOpen, Sparkles } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import AddAchievementModal from '../admin/components/AddAchievementModal';
import AchievementPosterModal from '../../components/AchievementPosterModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { getAchievementMarks } from '../../lib/scoring';
import StudentSpiritualActivities from '../mentor/components/StudentSpiritualActivities';
import StudentAcademicTasks from '../mentor/components/StudentAcademicTasks';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const StudentDashboard = () => {
  const { userData, logout } = useAuth();
  const { missionName, missionTarget, loadingSettings } = useSettings();
  const navigate = useNavigate();
  
  const [student, setStudent] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [analytics, setAnalytics] = useState({ classRank: 0, classTotal: 0, globalPercentile: 0, chartData: [] });
  const [loading, setLoading] = useState(true);
  const [achLoading, setAchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('achievements');
  const [cachedStudents, setCachedStudents] = useState(null);
  
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [viewingPosterAchievement, setViewingPosterAchievement] = useState(null);
  const [recordFilter, setRecordFilter] = useState('All');

  useEffect(() => {
    if (recordFilter === 'Mission 100' && missionName !== 'Mission 100') {
      setRecordFilter(missionName);
    }
  }, [missionName, recordFilter]);

  const filteredAchievements = React.useMemo(() => {
    return achievements.filter(ach => 
      recordFilter === 'All' || 
      (recordFilter === 'Outreach' && ach.isOutreach) || 
      (recordFilter === missionName && ach.isMission100) ||
      (recordFilter === 'Mission 100' && ach.isMission100)
    );
  }, [achievements, recordFilter, missionName]);

  const chartData = React.useMemo(() => {
    const distribution = {};
    filteredAchievements.forEach(ach => {
      if (ach.type) {
        distribution[ach.type] = (distribution[ach.type] || 0) + 1;
      }
    });
    
    return Object.keys(distribution).map(type => ({
       type,
       count: distribution[type],
       percentage: Math.round((distribution[type] / (filteredAchievements.length || 1)) * 100)
    })).sort((a,b) => b.count - a.count);
  }, [filteredAchievements]);

  const mission100Count = React.useMemo(() => {
    return achievements.filter(ach => ach.isMission100).length;
  }, [achievements]);

  const outreachCount = React.useMemo(() => {
    return achievements.filter(ach => ach.isOutreach).length;
  }, [achievements]);

  const fetchStudentData = async (admissionNumber, silent = false) => {
    if (!silent) setLoading(true);
    else setAchLoading(true);
    try {
      const q = query(collection(db, 'students'), where('admissionNumber', '==', admissionNumber));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0];
        const studentData = { id: studentDoc.id, ...studentDoc.data() };
        setStudent(studentData);

        const achQ = query(collection(db, 'achievements'), where('studentId', '==', studentDoc.id));
        const achSnapshot = await getDocs(achQ);
        const achData = [];
        achSnapshot.forEach(d => achData.push({ id: d.id, ...d.data() }));
        
        const processedAchData = achData.map(ach => ({
          ...ach,
          totalMarks: getAchievementMarks(ach)
        }));
        setAchievements(processedAchData);

        const currentAchievementTotal = Number(processedAchData.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0).toFixed(2));
        const currentTotalStars = processedAchData.reduce((acc, curr) => acc + (Number(curr.stars) || 0), 0);
        const currentNetScore = Number(Math.max(0, currentAchievementTotal - (studentData.minusPoints || 0)).toFixed(2));

        if (studentData.netScore !== currentNetScore || studentData.totalStars !== currentTotalStars || studentData.plusPoints !== currentAchievementTotal) {
          await updateDoc(doc(db, 'students', studentDoc.id), {
            plusPoints: currentAchievementTotal,
            netScore: currentNetScore,
            totalStars: currentTotalStars
          });
          setStudent(prev => ({...prev, netScore: currentNetScore, totalStars: currentTotalStars, plusPoints: currentAchievementTotal}));
        }

        let studentsList = cachedStudents;
        if (!studentsList) {
          const allStudentsSnap = await getDocs(collection(db, 'students'));
          studentsList = [];
          allStudentsSnap.forEach(doc => studentsList.push({ id: doc.id, ...doc.data() }));
          setCachedStudents(studentsList);
        }

        let totalGlobalScore = 0;
        let classMates = [];
        
        studentsList.forEach(s => {
          const score = s.id === studentDoc.id ? currentNetScore : (s.netScore || 0);
          if (score > 0) totalGlobalScore += score; 
          if (s.classId === studentData.classId) {
            classMates.push({ id: s.id, score });
          }
        });

        classMates.sort((a, b) => b.score - a.score);
        const myRank = classMates.findIndex(s => s.id === studentDoc.id) + 1;
        
        let globalPercentile = 0;
        if (totalGlobalScore > 0 && (studentData.netScore || 0) > 0) {
          globalPercentile = Math.round(((studentData.netScore || 0) / totalGlobalScore) * 100);
        }

        setAnalytics({ classRank: myRank, classTotal: classMates.length, globalPercentile });

      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setAchLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.admissionNumber) {
      fetchStudentData(userData.admissionNumber);
    }
  }, [userData]);

  const handleLogout = async () => {
    await logout();
    navigate('/student?tab=login');
  };

  const handleSaveAchievement = async (payload) => {
    try {
      if (editingAchievement) {
        const achRef = doc(db, 'achievements', editingAchievement.id);
        await updateDoc(achRef, payload);
        const oldMarks = Number(getAchievementMarks(editingAchievement)) || 0;
        const newMarks = Number(payload.totalMarks) || 0;
        const markDiff = newMarks - oldMarks;
        const oldStars = Number(editingAchievement.stars) || 0;
        const newStars = Number(payload.stars) || 0;
        const starDiff = newStars - oldStars;
        if (markDiff !== 0 || starDiff !== 0) {
          await updateDoc(doc(db, 'students', student.id), {
            plusPoints: increment(markDiff),
            netScore: increment(markDiff),
            totalStars: increment(starDiff)
          });
        }
      } 
      setIsAchievementModalOpen(false);
      setEditingAchievement(null);
      fetchStudentData(userData.admissionNumber, true);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to update achievement');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Student Profile Not Found</h2>
        <button onClick={handleLogout} className="px-4 py-2 bg-brand-green text-white rounded-lg">Return to Login</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-brand-green text-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold tracking-tight">Student Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition border border-white/20"
              title="Change Password"
            >
              <Key className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Change Password</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center text-brand-green bg-white hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition"
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden text-center relative pt-12 pb-8 px-6">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-brand-green to-brand-darkGreen" />
              <div className="relative mx-auto w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 mb-6">
                {student.photoURL ? (
                  <img src={student.photoURL} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <User className="w-16 h-16" />
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-1">{student.fullName}</h2>
              <p className="text-brand-green font-medium mb-6">Admission No: {student.admissionNumber}</p>
              
              <div className="bg-gray-50 rounded-2xl p-4 text-left border border-gray-100">
                <div className="mb-3">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Class</p>
                  <p className="text-gray-900 font-medium">{student.className}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Mentor</p>
                  <p className="text-gray-900 font-medium">{student.mentorName}</p>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 relative overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-orange-100/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <h3 className="text-gray-500 font-medium mb-1">{loadingSettings ? 'Loading...' : missionName}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900 tracking-tight">{mission100Count}</span>
                    <span className="text-lg font-bold text-gray-400">/ {missionTarget}</span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-inner">
                  <Target className="w-8 h-8 text-orange-500" />
                </div>
              </div>
              
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between text-xs font-bold text-gray-600 uppercase tracking-widest">
                  <span>Progress</span>
                  <span className="text-orange-500">{Math.min(Math.round((mission100Count / (missionTarget || 100)) * 100), 100)}%</span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((mission100Count / (missionTarget || 100)) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full shadow-md"
                  ></motion.div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/60 rounded-[24px] shadow-lg border border-amber-100/50 p-6 lg:p-8 flex-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative z-10 gap-4">
                <div className="flex gap-2 p-1 bg-white/20 backdrop-blur-md rounded-xl border border-amber-200/30">
                  <button 
                    onClick={() => setActiveTab('achievements')}
                    className={clsx("px-4 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'achievements' ? "bg-white text-amber-900 shadow-sm" : "text-amber-900 hover:bg-white/50")}
                  >
                    My Achievements
                  </button>
                  <button 
                    onClick={() => setActiveTab('insights')}
                    className={clsx("px-4 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'insights' ? "bg-white text-amber-900 shadow-sm" : "text-amber-900 hover:bg-white/50")}
                  >
                    Mentoring Insights
                  </button>
                </div>
                
                {activeTab === 'achievements' && (
                  <select
                    value={recordFilter}
                    onChange={(e) => setRecordFilter(e.target.value)}
                    className="w-full md:w-auto px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm font-semibold text-gray-700 shadow-sm"
                  >
                    <option value="All">All Achievements</option>
                    <option value="Outreach">Outreach Records</option>
                    <option value={missionName}>{missionName}</option>
                  </select>
                )}
              </div>

              {activeTab === 'achievements' ? (
                achLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mb-4"></div>
                  <p className="text-sm font-medium">Updating records...</p>
                </div>
              ) : filteredAchievements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-amber-700 bg-amber-100/40 rounded-[16px] border-2 border-dashed border-amber-200/60 relative z-10">
                  <Award className="w-16 h-16 mb-4 opacity-50 text-amber-400" />
                  <p className="text-[15px] font-bold">No achievements found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
                    {filteredAchievements.map((ach, idx) => (
                      <motion.div 
                        key={ach.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full"
                      >
                        {ach.photoURL && (
                          <div className="h-48 bg-gray-100 w-full overflow-hidden">
                            <img src={ach.photoURL} alt={ach.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                        )}
                        <div className="p-6 flex flex-col flex-1 relative">
                          <div className="flex justify-between items-start mb-2 pr-16">
                            <h4 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
                              {ach.title}
                              {ach.isMission100 && <img src="/mission100-logo.png" alt={missionName} className="w-5 h-5 object-contain" title={missionName} />}
                              {ach.isOutreach && <Globe className="w-4 h-4 text-brand-blue" title="Outreach Activity" />}
                            </h4>
                             <div className="absolute top-4 right-4">
                               <button 
                                 onClick={() => setViewingPosterAchievement(ach)}
                                 className="p-2.5 text-gray-400 hover:text-brand-blue hover:bg-blue-50 bg-white/80 backdrop-blur-sm rounded-full transition-colors shadow-sm border border-gray-100"
                                 title="View / Download Poster"
                               >
                                 <Download className="w-5 h-5" />
                               </button>
                             </div>
                          </div>
                          {(ach.conductedInstitution || ach.websiteName || ach.venue) && (
                            <p className="text-[12px] font-bold text-[#1e3a8a] mb-2 uppercase tracking-wider">
                              {[ach.conductedInstitution || ach.websiteName, ach.venue].filter(Boolean).join(' • ')}
                            </p>
                          )}
                          <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">{ach.note}</p>
                          
                          <div className="mt-auto pt-4 border-t border-gray-50 flex flex-wrap items-center gap-3">
                            {ach.grade && (
                              <span className="px-3 py-1 bg-brand-green/10 text-brand-green font-bold text-[10px] uppercase tracking-widest rounded-full">
                                {ach.grade}
                              </span>
                            )}
                            {ach.stars > 0 && (
                              <div className="flex bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                {Array.from({ length: ach.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                              </div>
                            )}
                            {ach.marks > 0 && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 font-bold text-[10px] uppercase tracking-widest rounded-full border border-gray-200">
                                +{ach.marks} Pts
                              </span>
                            )}
                            {ach.date && (
                              <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-auto">
                                <Calendar className="w-3.5 h-3.5 mr-1" />
                                {new Date(ach.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-8 relative z-10">
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-brand-blue" />
                      Spiritual Activities Performance
                    </h3>
                    <StudentSpiritualActivities student={student} readOnly={true} />
                  </div>
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-emerald-600" />
                      Academic Tasks Progress
                    </h3>
                    <StudentAcademicTasks student={student} readOnly={true} />
                  </div>
                </div>
              )}
              </div>
            </div>
          </motion.div>
      </main>

      <AddAchievementModal 
        isOpen={isAchievementModalOpen} 
        onClose={() => { setIsAchievementModalOpen(false); setEditingAchievement(null); }} 
        onSave={handleSaveAchievement} 
        initialData={editingAchievement}
      />

      <AchievementPosterModal 
        achievement={viewingPosterAchievement}
        student={student}
        onClose={() => setViewingPosterAchievement(null)}
      />

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        studentId={userData?.admissionNumber}
      />
    </div>
  );
};

export default StudentDashboard;
