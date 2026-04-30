import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, BookOpen, Calendar, CheckCircle2, TrendingUp, X, Target, MessageSquare, ListTodo } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../../../contexts/AuthContext';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TASK_TYPES = [
  'Write Five Lines',
  'Speak Practice',
  'Kithab Hall',
  'Reading Practice',
  'Discipline Task',
  'Other'
];

const LANGUAGES = ['Arabic', 'English', 'Urdu', 'Malayalam'];

const StudentAcademicTasks = ({ student, readOnly = false }) => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Task Form State
  const [taskForm, setTaskForm] = useState({
    type: 'Write Five Lines',
    customName: '',
    language: '',
    frequency: 'Weekly',
    targetCount: 5,
    suggestion: ''
  });

  // Record Form State
  const [recordForm, setRecordForm] = useState({
    date: new Date().toISOString().split('T')[0],
    completedCount: '',
    growthPercent: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [student.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Tasks
      const qTasks = query(collection(db, 'academic_tasks'), where('studentId', '==', student.id));
      const snapTasks = await getDocs(qTasks);
      const fetchedTasks = [];
      snapTasks.forEach(d => fetchedTasks.push({ id: d.id, ...d.data() }));
      setTasks(fetchedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

      // Fetch Records
      const qRecords = query(collection(db, 'academic_records'), where('studentId', '==', student.id));
      const snapRecords = await getDocs(qRecords);
      const fetchedRecords = [];
      snapRecords.forEach(d => fetchedRecords.push({ id: d.id, ...d.data() }));
      setRecords(fetchedRecords.sort((a, b) => new Date(b.date) - new Date(a.date)));

    } catch (err) {
      console.error("Error fetching academic data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingTask) {
        await updateDoc(doc(db, 'academic_tasks', editingTask.id), {
          type: taskForm.type,
          customName: taskForm.type === 'Other' ? taskForm.customName : '',
          language: taskForm.language,
          frequency: taskForm.frequency,
          targetCount: Number(taskForm.targetCount),
          suggestion: taskForm.suggestion
        });
      } else {
        const payload = {
          studentId: student.id,
          mentorUsername: userData?.username || '',
          type: taskForm.type,
          customName: taskForm.type === 'Other' ? taskForm.customName : '',
          language: taskForm.language,
          frequency: taskForm.frequency,
          targetCount: Number(taskForm.targetCount),
          suggestion: taskForm.suggestion,
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'academic_tasks'), payload);
      }
      setShowTaskForm(false);
      setEditingTask(null);
      resetTaskForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsSaving(true);
    try {
      const payload = {
        taskId: selectedTask.id,
        studentId: student.id,
        date: recordForm.date,
        completedCount: Number(recordForm.completedCount),
        growthPercent: recordForm.growthPercent !== '' ? Number(recordForm.growthPercent) : null,
        notes: recordForm.notes,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'academic_records'), payload);
      setShowRecordForm(false);
      resetRecordForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSuggestion = async (taskId, newSuggestion) => {
    try {
      await updateDoc(doc(db, 'academic_tasks', taskId), { suggestion: newSuggestion });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task and all its history?")) return;
    try {
      await deleteDoc(doc(db, 'academic_tasks', taskId));
      // Delete associated records
      const taskRecords = records.filter(r => r.taskId === taskId);
      for (const rec of taskRecords) {
        await deleteDoc(doc(db, 'academic_records', rec.id));
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteDoc(doc(db, 'academic_records', recordId));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({ type: 'Write Five Lines', customName: '', language: '', frequency: 'Weekly', targetCount: 5, suggestion: '' });
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      type: task.type,
      customName: task.customName || '',
      language: task.language || '',
      frequency: task.frequency || 'Weekly',
      targetCount: task.targetCount || 5,
      suggestion: task.suggestion || ''
    });
    setShowTaskForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetRecordForm = () => {
    setRecordForm({ date: new Date().toISOString().split('T')[0], completedCount: '', growthPercent: '', notes: '' });
  };

  // Analytics Calculations
  const getTaskAnalytics = (task) => {
    const taskRecords = records.filter(r => r.taskId === task.id);
    if (taskRecords.length === 0) return { completionPercent: 0, consistencyScore: 0, growthTrend: 0, history: [] };

    let totalCompleted = 0;
    let expectedTotal = taskRecords.length * task.targetCount;
    
    taskRecords.forEach(r => totalCompleted += r.completedCount);
    
    let completionPercent = expectedTotal > 0 ? Math.min(100, Math.round((totalCompleted / expectedTotal) * 100)) : 0;
    
    // Consistency: how many times they hit at least 80% of target
    let consistentWeeks = taskRecords.filter(r => r.completedCount >= task.targetCount * 0.8).length;
    let consistencyScore = Math.round((consistentWeeks / taskRecords.length) * 100);

    // Growth trend: comparing recent half with older half, unless manually specified in latest record
    let growthTrend = 0;
    const latestWithGrowth = [...taskRecords].sort((a,b) => new Date(b.date) - new Date(a.date)).find(r => r.growthPercent !== null && r.growthPercent !== undefined);

    if (latestWithGrowth) {
      growthTrend = latestWithGrowth.growthPercent;
    } else if (taskRecords.length >= 2) {
      const sorted = [...taskRecords].sort((a,b) => new Date(a.date) - new Date(b.date)); // oldest first
      const mid = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, mid);
      const secondHalf = sorted.slice(mid);
      
      const avg1 = firstHalf.reduce((acc, r) => acc + (r.completedCount / task.targetCount), 0) / firstHalf.length;
      const avg2 = secondHalf.reduce((acc, r) => acc + (r.completedCount / task.targetCount), 0) / secondHalf.length;
      
      growthTrend = Math.round((avg2 - avg1) * 100);
    }

    return { completionPercent, consistencyScore, growthTrend, history: taskRecords };
  };

  const globalCompletion = tasks.length > 0 ? Math.round(tasks.reduce((acc, t) => acc + getTaskAnalytics(t).completionPercent, 0) / tasks.length) : 0;
  const globalConsistency = tasks.length > 0 ? Math.round(tasks.reduce((acc, t) => acc + getTaskAnalytics(t).consistencyScore, 0) / tasks.length) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-blue rounded-3xl p-5 sm:p-6 text-white shadow-md border border-blue-600 relative overflow-hidden flex flex-col min-h-[140px]">
          <div className="absolute -right-4 -bottom-4 text-blue-500 opacity-20 pointer-events-none">
            <Target className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <p className="text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-wider leading-tight mb-2">Overall Completion</p>
            <h3 className="text-4xl font-black tracking-tight mb-2">{globalCompletion}%</h3>
            <p className="text-[11px] sm:text-xs font-medium text-blue-100 mt-auto leading-tight">Avg of {tasks.length} active tasks</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col min-h-[140px]">
           <div className="absolute -right-4 -bottom-4 text-emerald-50 opacity-80 pointer-events-none">
            <CheckCircle2 className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight mb-2">Consistency Score</p>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-2">{globalConsistency}%</h3>
            <p className="text-[11px] sm:text-xs font-bold text-emerald-500 mt-auto leading-tight">Reliability Index</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col min-h-[140px]">
          <div className="absolute -right-4 -bottom-4 text-indigo-50 opacity-80 pointer-events-none">
            <ListTodo className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight mb-2">Active Tasks</p>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-2">{tasks.length}</h3>
            <p className="text-[11px] sm:text-xs font-bold text-indigo-500 mt-auto leading-tight">Improvement Areas</p>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <button 
            onClick={() => {
              if (showTaskForm) {
                setShowTaskForm(false);
                setEditingTask(null);
                resetTaskForm();
              } else {
                setShowTaskForm(true);
              }
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2"
          >
            {showTaskForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showTaskForm ? 'Cancel Setup' : 'Setup New Task'}
          </button>
        </div>
      )}

      {/* Task Setup Form */}
      <AnimatePresence>
        {showTaskForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-lg shadow-gray-200/20 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-blue" />
                {editingTask ? 'Edit Improvement Task' : 'Configure Improvement Task'}
              </h3>
              
              <form onSubmit={handleSaveTask} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Task Type</label>
                    <select required value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800">
                      {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  {taskForm.type === 'Other' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Custom Task Name</label>
                      <input type="text" required placeholder="e.g. Daily Translation" value={taskForm.customName} onChange={e => setTaskForm({...taskForm, customName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Language (Optional)</label>
                    <select value={taskForm.language} onChange={e => setTaskForm({...taskForm, language: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800">
                      <option value="">None</option>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Frequency</label>
                    <select required value={taskForm.frequency} onChange={e => setTaskForm({...taskForm, frequency: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800">
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Planned Target Count</label>
                    <input type="number" min="1" required placeholder="e.g. 5 times" value={taskForm.targetCount} onChange={e => setTaskForm({...taskForm, targetCount: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800" />
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">How many times per period?</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Mentor Suggestion / Goal Focus</label>
                  <textarea rows={2} placeholder="Add advice or focus points for the student..." value={taskForm.suggestion} onChange={e => setTaskForm({...taskForm, suggestion: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-medium text-gray-800 resize-none" />
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-lightBlue transition disabled:opacity-70">
                    {isSaving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Tasks List */}
      {loading ? (
        <div className="p-10 text-center"><div className="animate-spin h-6 w-6 border-b-2 border-brand-blue mx-auto"></div></div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Academic Tasks</h3>
          <p className="text-sm text-gray-500">Setup an improvement task to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tasks.map((task) => {
            const analytics = getTaskAnalytics(task);
            const isTaskSelected = selectedTask?.id === task.id;

            return (
              <div key={task.id} className={cn("group bg-white rounded-3xl border overflow-hidden transition-all duration-300", isTaskSelected ? "border-brand-blue shadow-md" : "border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1")}>
                
                {/* Task Header Card */}
                <div className="p-5 sm:p-7 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center relative">
                  <div className="flex-1 w-full lg:w-auto">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h3 className="text-lg font-bold text-gray-800">
                        {task.type === 'Other' ? task.customName : task.type}
                      </h3>
                      {task.language && (
                        <span className="px-2 py-0.5 bg-brand-blue/5 text-brand-blue text-[10px] font-bold uppercase tracking-widest rounded border border-brand-blue/10">
                          {task.language}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded border border-gray-100">
                        {task.frequency} ({task.targetCount}x)
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="max-w-sm">
                      <div className="flex justify-between text-[10px] font-bold mb-1.5">
                        <span className="text-gray-400 uppercase tracking-widest">Completion</span>
                        <span className="text-gray-700">{analytics.completionPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", analytics.completionPercent >= 80 ? 'bg-emerald-500' : analytics.completionPercent >= 50 ? 'bg-brand-blue' : 'bg-amber-400')}
                          style={{ width: `${analytics.completionPercent}%` }}
                        />
                      </div>
                    </div>
                    {task.suggestion && !isTaskSelected && (
                      <div className="mt-3 text-[11px] text-gray-500 italic truncate max-w-sm bg-gray-50/50 px-3 py-2 rounded-lg border border-gray-100">
                        <span className="font-bold text-gray-600 mr-1">Suggestion:</span>
                        "{task.suggestion}"
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 lg:gap-8 bg-transparent">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Consistency</p>
                      <p className="text-lg font-black text-gray-800">{analytics.consistencyScore}%</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Growth</p>
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className={cn("w-4 h-4", analytics.growthTrend >= 0 ? "text-emerald-500" : "text-red-500")} />
                        <p className={cn("text-lg font-black", analytics.growthTrend >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {analytics.growthTrend > 0 ? '+' : ''}{analytics.growthTrend}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full lg:w-auto mt-4 lg:mt-0 items-center justify-end">
                    <button 
                      onClick={() => {
                        if (isTaskSelected) setSelectedTask(null);
                        else setSelectedTask(task);
                      }}
                      className={cn("flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border", 
                        isTaskSelected ? "bg-gray-100 border-gray-200 text-gray-700" : "bg-white border-gray-200 text-gray-600 hover:text-brand-blue hover:border-brand-blue shadow-sm hover:shadow"
                      )}
                    >
                      {isTaskSelected ? 'Close History' : 'View & Update'}
                    </button>
                    {!readOnly && (
                      <>
                        <button onClick={() => openEditTask(task)} className="p-2 text-gray-400 hover:text-brand-blue transition bg-white border border-transparent hover:border-brand-blue/20 hover:bg-brand-blue/5 rounded-lg" title="Edit Task">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-600 transition bg-white border border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg" title="Delete Task">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                <AnimatePresence>
                  {isTaskSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-100 bg-gray-50/50"
                    >
                      <div className="p-6 sm:p-8 space-y-8">
                        
                        {/* Suggestion Box */}
                        <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl relative group">
                          <MessageSquare className="w-5 h-5 text-amber-500 absolute top-5 left-5" />
                          <div className="pl-8">
                            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">Mentor Suggestion</h4>
                            <textarea 
                              className={cn("w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-amber-900 resize-none", readOnly && "cursor-default")}
                              rows={2}
                              defaultValue={task.suggestion}
                              readOnly={readOnly}
                              onBlur={(e) => {
                                if (!readOnly && e.target.value !== task.suggestion) {
                                  handleUpdateSuggestion(task.id, e.target.value);
                                }
                              }}
                              placeholder="Type a suggestion and click outside to save..."
                            />
                          </div>
                        </div>

                        {/* Record Form & History */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          
                          {/* Log New Entry */}
                          {!readOnly && (
                            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
                              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-brand-blue" /> Log Progress
                              </h4>
                              <form onSubmit={handleSaveRecord} className="space-y-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date</label>
                                  <input type="date" required value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue text-sm font-medium" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Completed Count</label>
                                  <input type="number" min="0" required placeholder={`Target: ${task.targetCount}`} value={recordForm.completedCount} onChange={e => setRecordForm({...recordForm, completedCount: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue text-sm font-medium" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Growth % (Optional)</label>
                                  <input type="number" placeholder="e.g. 15 for +15%" value={recordForm.growthPercent} onChange={e => setRecordForm({...recordForm, growthPercent: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue text-sm font-medium" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notes (Optional)</label>
                                  <textarea rows={2} placeholder="Observations..." value={recordForm.notes} onChange={e => setRecordForm({...recordForm, notes: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue text-sm font-medium resize-none" />
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full py-2 bg-brand-blue text-white rounded-lg text-sm font-bold hover:bg-brand-lightBlue transition disabled:opacity-70">
                                  Save Log
                                </button>
                              </form>
                            </div>
                          )}

                          {/* History Table */}
                          <div className={cn("bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col", !readOnly ? "lg:col-span-2" : "lg:col-span-3")}>
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-blue" /> Completion History
                              </h4>
                            </div>
                            <div className="flex-1 overflow-auto max-h-[300px]">
                              {analytics.history.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-500 font-medium">No progress logged yet.</div>
                              ) : (
                                <table className="w-full text-left text-sm">
                                  <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest sticky top-0">
                                    <tr>
                                      <th className="p-3 pl-4">Date</th>
                                      <th className="p-3 text-center">Score</th>
                                      <th className="p-3 text-center">Growth</th>
                                      <th className="p-3">Notes</th>
                                      {!readOnly && <th className="p-3 pr-4 text-right"></th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {analytics.history.map(rec => {
                                      const isTargetMet = rec.completedCount >= task.targetCount;
                                      return (
                                        <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="p-3 pl-4 font-semibold text-gray-800 whitespace-nowrap">
                                            {new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                          </td>
                                          <td className="p-3 text-center">
                                            <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold border", isTargetMet ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                                              {rec.completedCount} / {task.targetCount}
                                            </span>
                                          </td>
                                          <td className="p-3 text-center text-xs font-bold">
                                            {rec.growthPercent != null ? (
                                              <span className={rec.growthPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                {rec.growthPercent > 0 ? '+' : ''}{rec.growthPercent}%
                                              </span>
                                            ) : '-'}
                                          </td>
                                          <td className="p-3 text-gray-600 text-xs truncate max-w-[150px]" title={rec.notes}>{rec.notes || '-'}</td>
                                          {!readOnly && (
                                            <td className="p-3 pr-4 text-right">
                                              <button onClick={() => handleDeleteRecord(rec.id)} className="text-gray-400 hover:text-red-500 transition">
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            )
          })}
        </div>
      )}

    </div>
  );
};

export default StudentAcademicTasks;
