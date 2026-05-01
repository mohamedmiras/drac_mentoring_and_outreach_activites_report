import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, increment } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { getAchievementMarks } from '../../lib/scoring';
import { ArrowLeft, User, Award, Plus, Calendar, Trash2, Camera, Star, Trophy, PieChart, Eye, EyeOff, Pencil, Languages, Activity, Target, Globe } from 'lucide-react';
import { processAndUploadImage } from '../../lib/imageOptimization';
import AddAchievementModal from '../admin/components/AddAchievementModal';
import EditStudentModal from '../admin/components/EditStudentModal';
import StudentLeaveActivities from './components/StudentLeaveActivities';
import confetti from 'canvas-confetti';
const MentorStudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [student, setStudent] = useState(location.state?.student || null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(!location.state?.student);
  const [analytics, setAnalytics] = useState({ classRank: 0, classTotal: 0, globalPercentile: 0, chartData: [] });
  const [cachedStudents, setCachedStudents] = useState(null);

  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [achLoading, setAchLoading] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchStudentAndAchievements();
  }, [studentId]);

  const getShortClassName = (className) => {
    if (!className) return 'N/A';
    const name = className.toLowerCase();
    if (name.includes('secondary final year')) return 'S5';
    if (name.includes('senior secondary first year')) return 'SS1';
    if (name.includes('senior secondary final year')) return 'SS2';
    if (name.includes('degree first year')) return 'D1';
    return className;
  };

  const fetchStudentAndAchievements = async (silent = false) => {
    if (!silent && !student) setLoading(true);
    else setAchLoading(true);
    try {
      const docRef = doc(db, 'students', studentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStudent({ id: docSnap.id, ...docSnap.data() });
      } else {
        alert("Student not found");
        navigate('/mentor');
      }

      const q = query(collection(db, 'achievements'), where('studentId', '==', studentId));
      const querySnapshot = await getDocs(q);
      const achData = [];
      querySnapshot.forEach((d) => achData.push({ id: d.id, ...d.data() }));
      
      const processedAchData = achData.map(ach => ({
        ...ach,
        totalMarks: getAchievementMarks(ach)
      }));

      processedAchData.sort((a, b) => {
        const dateA = a.date || a.createdAt;
        const dateB = b.date || b.createdAt;
        return new Date(dateB) - new Date(dateA);
      });
      
      setAchievements(processedAchData);

      // --- Analytics Calculations ---
      let studentsList = cachedStudents;
      if (!studentsList) {
        const allStudentsSnap = await getDocs(collection(db, 'students'));
        studentsList = [];
        allStudentsSnap.forEach(doc => studentsList.push({ id: doc.id, ...doc.data() }));
        setCachedStudents(studentsList);
      }

      let totalGlobalScore = 0;
      let classMates = [];
      
      const currentAchievementTotal = Number(processedAchData.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0).toFixed(2));
      const currentTotalStars = processedAchData.reduce((acc, curr) => acc + (Number(curr.stars) || 0), 0);
      const currentNetScore = Number(Math.max(0, currentAchievementTotal - (docSnap.data().minusPoints || 0)).toFixed(2));

      if (docSnap.data().netScore !== currentNetScore || docSnap.data().totalStars !== currentTotalStars || docSnap.data().plusPoints !== currentAchievementTotal) {
        await updateDoc(docRef, {
          plusPoints: currentAchievementTotal,
          netScore: currentNetScore,
          totalStars: currentTotalStars
        });
        setStudent(prev => ({...prev, netScore: currentNetScore, totalStars: currentTotalStars, plusPoints: currentAchievementTotal}));
      }
      
      studentsList.forEach(s => {
        const score = s.id === studentId ? currentNetScore : (s.netScore || 0);
        if (score > 0) totalGlobalScore += score; 
        if (s.classId === docSnap.data().classId) {
          classMates.push({ id: s.id, score, fullName: s.fullName || '' });
        }
      });

      classMates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.fullName.localeCompare(b.fullName);
      });
      const myRank = classMates.findIndex(s => s.id === studentId) + 1;
      
      let globalPercentile = 0;
      if (totalGlobalScore > 0 && currentNetScore > 0) {
        globalPercentile = Math.round((currentNetScore / totalGlobalScore) * 100);
      }

      const distribution = {};
      achData.forEach(ach => {
        if (ach.type) distribution[ach.type] = (distribution[ach.type] || 0) + 1;
      });
      
      const chartData = Object.keys(distribution).map(type => ({
          type,
          count: distribution[type],
          percentage: Math.round((distribution[type] / achData.length) * 100)
      })).sort((a,b) => b.count - a.count);

      setAnalytics({ classRank: myRank, classTotal: classMates.length, globalPercentile, chartData });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setAchLoading(false);
    }
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
          await updateDoc(doc(db, 'students', studentId), {
            plusPoints: increment(markDiff),
            netScore: increment(markDiff),
            totalStars: increment(starDiff)
          });
        }
      } else {
        await addDoc(collection(db, 'achievements'), {
          ...payload,
          studentId,
          className: student.className,
          classId: student.classId,
          mentorName: student.mentorName || 'Unknown Mentor'
        });

        const safeMarks = Number(payload.totalMarks) || 0;
        const safeStars = Number(payload.stars) || 0;

        await updateDoc(doc(db, 'students', studentId), {
          plusPoints: increment(safeMarks),
          netScore: increment(safeMarks),
          totalStars: increment(safeStars)
        });

        const duration = 2500;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1']
          });
          confetti({
            particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1']
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }

      setIsAchievementModalOpen(false);
      setEditingAchievement(null);
      fetchStudentAndAchievements(true);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to process achievement');
    }
  };

  const handleSaveStudent = async (payload) => {
    setIsSavingStudent(true);
    try {
      await updateDoc(doc(db, 'students', studentId), payload);
      setStudent(prev => ({ ...prev, ...payload }));
      setIsEditStudentModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to update student profile");
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleUpdateProfilePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUpdatingPhoto(true);
    try {
      const photoURL = await processAndUploadImage(file, 'profile');
      await updateDoc(doc(db, 'students', studentId), { photoURL });
      setStudent(prev => ({ ...prev, photoURL }));
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to update profile photo");
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleDeleteAchievement = async (ach) => {
    if (confirm("Are you sure you want to delete this achievement? Points and Stars will be deducted.")) {
      await deleteDoc(doc(db, 'achievements', ach.id));
      if (ach.marks || ach.stars || ach.totalMarks) {
        const marksToDeduct = Number(getAchievementMarks(ach)) || 0;
        const starsToDeduct = Number(ach.stars) || 0;
        await updateDoc(doc(db, 'students', studentId), {
          plusPoints: increment(-marksToDeduct),
          netScore: increment(-marksToDeduct),
          totalStars: increment(-starsToDeduct)
        });
      }
      fetchStudentAndAchievements(true);
    }
  };

  if (loading && !student) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (!student) return null;

  const outreachCount = achievements.filter(ach => ach.isOutreach).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      <header className="bg-amber-50 border-b border-amber-100 sticky top-0 z-20 px-4 sm:px-8 h-16 flex items-center shadow-sm">
        <button 
          onClick={() => navigate('/mentor/dashboard', { state: { activeTab: 'mentees' } })} 
          className="flex items-center text-sm font-bold text-black hover:text-gray-700 transition group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mr-3 group-hover:bg-amber-200 transition-all text-amber-600">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to Dashboard
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-center p-6 relative">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-brand-blue to-blue-700 shadow-inner" />
              <div className="relative mx-auto w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 mb-4 mt-8 group">
                {updatingPhoto && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
                {student.photoURL ? (
                  <img src={student.photoURL} alt={student.fullName} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                    <User className="w-16 h-16" />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer z-10">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={handleUpdateProfilePhoto} disabled={updatingPhoto} />
                </label>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{student.fullName}</h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <p className="text-gray-500">Adm: {student.admissionNumber}</p>
                <button 
                  onClick={() => setIsEditStudentModalOpen(true)}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-left border-t border-gray-100 pt-4 mt-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Class</p>
                  <p className="font-bold text-brand-blue text-base">{getShortClassName(student.className)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Mentor</p>
                  <p className="font-medium text-gray-800 text-sm leading-tight">{student.mentorName || 'None'}</p>
                </div>
                <div className="col-span-2 pt-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Password</p>
                  <div className="flex items-center">
                    <p className="font-mono text-gray-800 text-sm bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                      {showPassword ? (student.password || 'Not Set') : '••••••••'}
                    </p>
                    <button onClick={() => setShowPassword(!showPassword)} className="ml-2 text-gray-400 hover:text-brand-blue transition">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-white rounded-[24px] shadow-xl shadow-blue-500/5 border border-gray-100 p-6 lg:p-8 mt-6 relative overflow-hidden group"
            >
              <h3 className="text-[17px] font-black text-gray-900 mb-6 flex items-center gap-3 tracking-tight relative z-10">
                <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shadow-inner">
                  <Activity className="w-4.5 h-4.5 text-brand-blue" />
                </div>
                Performance Metrics
              </h3>
              
              <div className="flex flex-col gap-3 mb-6 relative z-10">
                {/* Net Score */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-blue-100/60 rounded-2xl p-3.5 border border-blue-200/50 shadow-sm flex justify-between items-center group hover:bg-white hover:border-brand-blue/30 transition-all relative z-10"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-blue-700/70 mb-0.5">Net Score</p>
                    <div className="flex items-center gap-1">
                      <span className="text-base font-bold text-blue-900 tracking-tight">{student.netScore || 0}</span>
                      <span className="text-[9px] font-bold text-blue-500 uppercase">Pts</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm border border-blue-100 transition-all">
                    <Activity className="w-4.5 h-4.5 text-brand-blue" />
                  </div>
                </motion.div>
                
                {/* Total Stars */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-amber-100/60 rounded-2xl p-3.5 border border-amber-200/50 shadow-sm flex justify-between items-center group hover:bg-white hover:border-amber-200 transition-all relative z-10"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-amber-700/70 mb-0.5">Total Stars</p>
                    <div className="flex items-center gap-1">
                      <span className="text-base font-bold text-amber-900 tracking-tight">{student.totalStars || 0}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm border border-amber-100 transition-all">
                    <Star className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                </motion.div>

                {/* Outreach Activities */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-emerald-100/60 rounded-2xl p-3.5 border border-emerald-200/50 shadow-sm flex justify-between items-center group hover:bg-white hover:border-emerald-200 transition-all relative z-10"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-emerald-700/70 mb-0.5 uppercase">Outreach Activities</p>
                    <div className="flex items-center gap-1">
                      <span className="text-base font-bold text-emerald-900 tracking-tight">{outreachCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm border border-emerald-100 transition-all">
                    <Globe className="w-4.5 h-4.5 text-emerald-500" />
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-50 rounded-[16px] p-4 border border-gray-100 shadow-sm hover:bg-white transition-all duration-300 group/stat"
                >
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-6 h-6 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center text-brand-blue">
                       <Trophy className="w-3 h-3" />
                     </div>
                     <p className="text-[11px] font-bold text-gray-500">Class Rank</p>
                  </div>
                  <p className="text-base font-bold text-gray-900 tracking-tight ml-1">{analytics.classRank} <span className="text-[10px] font-medium text-gray-400">/ {analytics.classTotal}</span></p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gray-50 rounded-[16px] p-4 border border-gray-100 shadow-sm hover:bg-white transition-all duration-300 group/stat"
                >
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-6 h-6 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center text-brand-blue">
                       <PieChart className="w-3 h-3" />
                     </div>
                     <p className="text-[11px] font-bold text-gray-500">Campus Rating</p>
                  </div>
                  <p className="text-base font-bold text-gray-900 tracking-tight ml-1">{analytics.globalPercentile}%</p>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Achievements Section */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {analytics.chartData.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 p-6 lg:p-8">
                    <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-brand-blue" /> 
                      Work Distribution
                    </h3>
                    <div className="space-y-5">
                      {analytics.chartData.map((data, i) => (
                        <div key={i} className="flex flex-col gap-2 group">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-700">{data.type}</span>
                            <span className="font-black text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-md border border-gray-100">{data.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${data.percentage}%` }}
                              transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                              className="bg-gradient-to-r from-brand-blue to-brand-lightBlue h-full rounded-full group-hover:brightness-110 transition-all"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 overflow-hidden flex flex-col h-full">
                  {/* Highlighted Student Info Header */}
                  <div className="bg-gradient-to-br from-blue-100/40 via-blue-50/20 to-white p-6 border-b border-blue-100">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-blue font-black text-2xl border border-gray-100 overflow-hidden shrink-0">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt={student.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="opacity-40">{student.fullName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-2xl font-black text-gray-900 leading-tight truncate">{student.fullName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest bg-brand-blue/5 px-2 py-0.5 rounded-md border border-brand-blue/10">
                            Class: {student.className}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 lg:p-8 flex-1">
                    <div className="flex justify-between items-center mb-10 border-b border-gray-100 pb-6">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Award className="w-5 h-5 text-amber-500" />
                        </div>
                        All-Time Records
                      </h3>
                      <button
                        onClick={() => { setEditingAchievement(null); setIsAchievementModalOpen(true); }}
                        className="flex items-center px-4 py-2 bg-brand-blue text-white rounded-xl hover:bg-brand-lightBlue transition shadow-lg shadow-brand-blue/20 font-bold text-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Record
                      </button>
                    </div>
                    
                    {achLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mb-4"></div>
                        <p className="text-sm font-medium">Updating records...</p>
                      </div>
                    ) : achievements.length === 0 ? (
                      <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium text-gray-500">No achievements added yet.</p>
                      </div>
                    ) : (
                    <div className="flex overflow-x-auto snap-x snap-mandatory pb-6 -mx-6 px-6 gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-col sm:space-y-8 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 sm:gap-0 relative sm:before:absolute sm:before:inset-0 sm:before:left-6 sm:before:-translate-x-px sm:before:h-full sm:before:w-0.5 sm:before:bg-gradient-to-b sm:before:from-transparent sm:before:via-gray-200 sm:before:to-transparent">
                      {achievements.map((ach) => (
                        <div key={ach.id} className="relative flex items-start group w-[85vw] shrink-0 snap-center sm:w-auto sm:shrink sm:snap-align-none">
                          <div className="hidden sm:flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-white bg-gray-50 text-gray-400 shadow shrink-0 absolute left-0 group-hover:bg-brand-blue group-hover:text-white transition-colors duration-300 z-10">
                            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="w-full sm:ml-16 p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-gradient-to-br from-brand-blue/5 to-brand-green/5 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-0.5 relative z-10">
                              <h4 className="text-lg font-black text-gray-900 leading-tight pr-8 flex items-center gap-2">
                                {ach.type}
                                {ach.isMission100 && <img src="/mission100-logo.png" alt="Mission 100" className="w-5 h-5 object-contain" title="Mission 100" />}
                                {ach.isOutreach && <Globe className="w-4 h-4 text-brand-blue" title="Outreach Activity" />}
                              </h4>
                              <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingAchievement(ach); setIsAchievementModalOpen(true); }} className="p-2 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition" title="Edit">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteAchievement(ach)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-4 bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-100 relative z-10">{ach.category}</p>
                            
                            {ach.type === 'Workshop / Seminar Attendance' && ach.title && (
                              <p className="text-[15px] font-bold text-gray-800 mb-1 relative z-10">
                                {ach.title}
                              </p>
                            )}
                            
                            {ach.specificType && (
                              <p className="text-[13px] font-bold text-gray-600 mb-0.5 relative z-10">
                                {ach.specificType.charAt(0).toUpperCase() + ach.specificType.slice(1).toLowerCase()}
                              </p>
                            )}
                            
                            {(ach.conductedInstitution || ach.websiteName || ach.venue) && (
                              <p className="text-[11px] font-bold text-brand-blue mb-0.5 relative z-10 uppercase tracking-wider">
                                {[ach.conductedInstitution || ach.websiteName, ach.venue].filter(Boolean).join(' • ')}
                              </p>
                            )}

                            {ach.language && (
                              <div className="flex items-center gap-1.5 mb-2 relative z-10">
                                <Languages className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{ach.language}</span>
                              </div>
                            )}
                            
                            <p className="text-gray-500 text-sm mb-5 line-clamp-3 relative z-10">{ach.note || 'No description provided.'}</p>
                            
                            {ach.photoURL && (
                              <div className="mb-5 rounded-xl overflow-hidden border border-gray-100 w-full aspect-video bg-gray-50 relative z-10">
                                 <img src={ach.photoURL} alt={ach.title} loading="lazy" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-50 relative z-10">
                              {ach.grade && (
                                <span className="px-2.5 py-1 bg-brand-blue/5 text-brand-blue font-black text-[10px] uppercase tracking-widest rounded-md border border-brand-blue/10">
                                  {ach.grade}
                                </span>
                              )}
                              {ach.stars > 0 && (
                                <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                  {Array.from({ length: ach.stars }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                                </div>
                              )}
                              {ach.totalMarks > 0 && (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-md border border-emerald-100">
                                  +{ach.totalMarks} Pts
                                </span>
                              )}
                              {ach.date && (
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-auto flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {(() => {
                                    const parts = ach.date.split('-');
                                    if (parts.length === 2) {
                                      const d = new Date(parts[0], parseInt(parts[1]) - 1);
                                      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                                    } else {
                                      const d = new Date(ach.date);
                                      if (isNaN(d.getTime())) return ach.date;
                                      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                    }
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 p-6 lg:p-8">
               <StudentLeaveActivities student={student} />
            </div>

          </div>
        </div>
      </main>

      <AddAchievementModal 
        isOpen={isAchievementModalOpen} 
        onClose={() => { setIsAchievementModalOpen(false); setEditingAchievement(null); }} 
        onSave={handleSaveAchievement} 
        initialData={editingAchievement}
      />

      <EditStudentModal
        isOpen={isEditStudentModalOpen}
        onClose={() => setIsEditStudentModalOpen(false)}
        onSave={handleSaveStudent}
        studentData={student}
        isSaving={isSavingStudent}
      />
    </div>
  );
};

export default MentorStudentProfile;
