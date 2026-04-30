import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, increment, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, CheckSquare, Square, Search, Filter, Plus, Edit2, Trash2, Calendar, MapPin, X, FileEdit, Target, ListTodo, GraduationCap, CheckCircle2, Download } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const PURPOSES = ['Private', 'General', 'Personal', 'Co-curricular', 'Syllabus', 'Spiritual', 'Career / Skill-oriented', 'Happiness', 'Other'];
const LOCATIONS = ['Staffroom', 'Campus Corridors', 'Outer Spaces', 'Other'];

const MeetingRecords = ({ mentees, mentorProfile }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    purpose: '',
    otherPurpose: '',
    date: new Date().toISOString().split('T')[0],
    studentIds: [],
    location: '',
    otherLocation: '',
    description: '',
    outcome: ''
  });

  // Filters State
  const [filterPeriod, setFilterPeriod] = useState('All-Time');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, [mentorProfile.username]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'mentor_meetings'), where('mentorUsername', '==', mentorProfile.username));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      
      // Sort by date descending
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMeetings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (id) => {
    setFormData(prev => {
      if (prev.studentIds.includes(id)) {
        return { ...prev, studentIds: prev.studentIds.filter(s => s !== id) };
      } else {
        return { ...prev, studentIds: [...prev.studentIds, id] };
      }
    });
  };

  const toggleAllStudents = () => {
    if (formData.studentIds.length === mentees.length) {
      setFormData(prev => ({ ...prev, studentIds: [] }));
    } else {
      setFormData(prev => ({ ...prev, studentIds: mentees.map(m => m.id) }));
    }
  };

  const handleSaveMeeting = async (e) => {
    e.preventDefault();
    if (formData.studentIds.length === 0) return alert("Please select at least one student.");
    if (!formData.purpose) return alert("Please select a meeting purpose.");

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        mentorUsername: mentorProfile.username,
        updatedAt: new Date().toISOString()
      };

      if (editingMeeting) {
        // Find difference in students to update their counts
        const removedStudents = editingMeeting.studentIds.filter(id => !formData.studentIds.includes(id));
        const addedStudents = formData.studentIds.filter(id => !editingMeeting.studentIds.includes(id));

        await updateDoc(doc(db, 'mentor_meetings', editingMeeting.id), payload);

        // Update student meeting counts
        for (const id of removedStudents) {
          await updateDoc(doc(db, 'students', id), { meetingsCount: increment(-1) });
        }
        for (const id of addedStudents) {
          await updateDoc(doc(db, 'students', id), { meetingsCount: increment(1) });
        }
      } else {
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'mentor_meetings'), payload);
        
        // Increment meeting count for all attended students
        for (const id of formData.studentIds) {
          await updateDoc(doc(db, 'students', id), { meetingsCount: increment(1) });
        }
      }

      setShowAddForm(false);
      setEditingMeeting(null);
      resetForm();
      fetchMeetings();
      // Need to somehow trigger mentees refresh to update their local count. For now, rely on dynamic calculation for tracker.
    } catch (err) {
      console.error(err);
      alert("Failed to save meeting.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (meeting) => {
    if (!window.confirm("Are you sure you want to delete this meeting? It will reduce the meeting count for the attended students.")) return;
    try {
      await deleteDoc(doc(db, 'mentor_meetings', meeting.id));
      for (const id of meeting.studentIds) {
        await updateDoc(doc(db, 'students', id), { meetingsCount: increment(-1) });
      }
      fetchMeetings();
    } catch (err) {
      console.error(err);
      alert("Failed to delete meeting");
    }
  };

  const openEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      purpose: meeting.purpose,
      otherPurpose: meeting.otherPurpose || '',
      date: meeting.date,
      studentIds: meeting.studentIds,
      location: meeting.location,
      otherLocation: meeting.otherLocation || '',
      description: meeting.description,
      outcome: meeting.outcome || ''
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({
      purpose: '',
      otherPurpose: '',
      date: new Date().toISOString().split('T')[0],
      studentIds: [],
      location: '',
      otherLocation: '',
      description: '',
      outcome: ''
    });
  };

  // Metrics Calculations
  // Since mentees list from props might not instantly reflect the updated meetingsCount, we calculate it directly from the meetings array for instant accuracy.
  const meetingCounts = {};
  mentees.forEach(m => meetingCounts[m.id] = 0);
  meetings.forEach(meet => {
    meet.studentIds.forEach(id => {
      if (meetingCounts[id] !== undefined) meetingCounts[id]++;
    });
  });

  const studentsCompleted10 = mentees.filter(m => meetingCounts[m.id] >= 10).length;
  const studentsBelow10 = mentees.filter(m => meetingCounts[m.id] < 10).length;

  const handleExportToWord = () => {
    // 1. Sort by date ascending for the report
    const sortedMeetings = [...meetings].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 2. Build HTML content for Word
    const mentorName = mentorProfile.name;
    const menteeNames = mentees.map(m => m.fullName).join(', ');

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.15; color: #000; }
          .title-teacher { font-size: 20pt; font-weight: bold; text-align: left; margin-bottom: 2pt; }
          .mentees-row { font-size: 11pt; text-align: left; color: #666; margin-bottom: 25pt; }
          .mentees-names { font-style: italic; }
          .meeting-section { margin-bottom: 30pt; page-break-inside: avoid; }
          .meeting-heading { font-size: 16pt; font-weight: bold; color: #4b86e4; margin-bottom: 5pt; }
          .field-row { font-size: 11pt; margin-bottom: 4pt; }
          .field-label { font-weight: bold; }
          .field-value { font-style: italic; }
          .subheading { font-size: 11pt; font-weight: bold; margin-top: 15pt; margin-bottom: 8pt; }
          ul { margin-top: 5pt; margin-bottom: 15pt; padding-left: 25pt; }
          li { margin-bottom: 4pt; }
        </style>
      </head>
      <body>
        <div class="title-teacher">${mentorName}</div>
        <div class="mentees-row">
          <span>Mentees: </span>
          <span class="mentees-names">${menteeNames}</span>
        </div>
    `;

    sortedMeetings.forEach((meet, index) => {
      const type = meet.purpose === 'Other' ? meet.otherPurpose : meet.purpose;
      const location = meet.location === 'Other' ? meet.otherLocation : meet.location;
      const dateStr = new Date(meet.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const attendees = meet.studentIds.length === mentees.length 
        ? "All Mentees" 
        : meet.studentIds.map(id => mentees.find(m => m.id === id)?.fullName || 'Unknown').join(', ');

      // Clean and format bullets
      const cleanBullets = (text) => {
        if (!text) return '';
        return text.split('\n')
          .filter(line => line.trim())
          .map(line => `<li>${line.replace(/^[•\-\*]\s*/, '').trim()}</li>`)
          .join('');
      };

      html += `
        <div class="meeting-section">
          <div class="meeting-heading">Meeting ${index + 1}:</div>
          
          <div class="field-row"><span class="field-label">Purpose:</span> <span class="field-value">${type},</span></div>
          <div class="field-row"><span class="field-label">Location:</span> <span class="field-value">${location},</span></div>
          <div class="field-row"><span class="field-label">Date:</span> <span class="field-value">${dateStr}</span></div>
          <div class="field-row"><span class="field-label">Participated Candidates:</span> <span class="field-value">${attendees}</span></div>
          
          <div class="subheading">Meeting Minutes</div>
          <ul>${cleanBullets(meet.description) || '<li>No details recorded</li>'}</ul>
          
          ${meet.outcome ? `
          <div class="subheading">Outcome</div>
          <ul>${cleanBullets(meet.outcome)}</ul>` : ''}
        </div>
      `;
    });

    html += `</body></html>`;

    // 3. Trigger Download
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Meeting_Records_${mentorName.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic
  const filteredMeetings = meetings.filter(meet => {
    let matchPeriod = true;
    if (filterPeriod !== 'All-Time') {
      const meetDate = new Date(meet.date);
      const now = new Date();
      if (filterPeriod === 'Today') matchPeriod = meetDate.toDateString() === now.toDateString();
      if (filterPeriod === 'This Month') matchPeriod = meetDate.getMonth() === now.getMonth() && meetDate.getFullYear() === now.getFullYear();
    }
    
    let matchStudent = true;
    if (filterStudent) {
      matchStudent = meet.studentIds.includes(filterStudent);
    }

    let matchType = true;
    if (filterType) {
      matchType = meet.purpose === filterType;
    }

    return matchPeriod && matchStudent && matchType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Tracker Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-100/50 rounded-full group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
          <div className="flex items-center gap-4 mb-2 relative z-10">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-600/80 uppercase tracking-widest">Total Meetings</p>
              <h3 className="text-3xl font-black text-indigo-900">{meetings.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-100/50 rounded-full group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
          <div className="flex items-center gap-4 mb-2 relative z-10">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-600/80 uppercase tracking-widest">Completed 10+</p>
              <h3 className="text-3xl font-black text-emerald-900">{studentsCompleted10}</h3>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-100/50 rounded-full group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
          <div className="flex items-center gap-4 mb-2 relative z-10">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-600/80 uppercase tracking-widest">Pending Below 10</p>
              <h3 className="text-3xl font-black text-amber-900">{studentsBelow10}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Student Progress Bars */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-brand-blue" />
          Mentee Meeting Progress
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentees.map(m => {
            const count = meetingCounts[m.id] || 0;
            const progress = Math.min((count / 10) * 100, 100);
            const isComplete = count >= 10;
            return (
              <div key={m.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800 text-sm truncate pr-2">{m.fullName}</span>
                  <span className={cn("text-xs font-black", isComplete ? "text-emerald-600" : "text-amber-600")}>
                    {count} / 10
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1 }}
                    className={cn("h-full rounded-full", isComplete ? "bg-emerald-500" : "bg-amber-400")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-extrabold text-gray-900">Meeting Records</h2>
        {!showAddForm && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleExportToWord}
              disabled={meetings.length === 0}
              className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-gray-400" /> Export to Word
            </button>
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex-1 sm:flex-none px-6 py-3 bg-brand-blue text-white rounded-xl font-bold shadow-lg shadow-brand-blue/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Log New Meeting
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6 py-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setShowAddForm(false); setEditingMeeting(null); resetForm(); }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-white/20 flex flex-col max-h-full overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileEdit className="w-6 h-6 text-brand-blue" />
                  {editingMeeting ? 'Edit Meeting Record' : 'Log New Meeting'}
                </h3>
                <button 
                  onClick={() => { setShowAddForm(false); setEditingMeeting(null); resetForm(); }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto">
                <form onSubmit={handleSaveMeeting} className="space-y-8">
                {/* Top Row: Purpose & Date & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Purpose</label>
                    <select 
                      required
                      value={formData.purpose}
                      onChange={e => setFormData({...formData, purpose: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-gray-800 font-semibold appearance-none"
                    >
                      <option value="">Select Purpose...</option>
                      {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {formData.purpose === 'Other' && (
                      <input 
                        type="text" placeholder="Specify other purpose..." required
                        value={formData.otherPurpose} onChange={e => setFormData({...formData, otherPurpose: e.target.value})}
                        className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Date</label>
                    <input 
                      type="date" required
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-gray-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Location</label>
                    <select 
                      required
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-gray-800 font-semibold appearance-none"
                    >
                      <option value="">Select Location...</option>
                      {LOCATIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {formData.location === 'Other' && (
                      <input 
                        type="text" placeholder="Specify other location..." required
                        value={formData.otherLocation} onChange={e => setFormData({...formData, otherLocation: e.target.value})}
                        className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"
                      />
                    )}
                  </div>
                </div>

                {/* Attended Students */}
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Attended Students</label>
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                     <button type="button" onClick={toggleAllStudents} className="flex items-center gap-2 mb-4 text-brand-blue font-bold text-sm hover:underline">
                       {formData.studentIds.length === mentees.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                       Select All Students
                     </button>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                       {mentees.map(m => (
                         <label 
                           key={m.id} 
                           onClick={() => handleStudentToggle(m.id)}
                           className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all", formData.studentIds.includes(m.id) ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 hover:bg-gray-100")}
                         >
                           {formData.studentIds.includes(m.id) ? <CheckSquare className="w-5 h-5 text-brand-blue shrink-0" /> : <Square className="w-5 h-5 text-gray-300 shrink-0" />}
                           <span className="font-semibold text-sm text-gray-800 line-clamp-1">{m.fullName}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                </div>

                {/* Textareas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Meeting Description</label>
                    <textarea 
                      required rows={6} placeholder="• Discussed exam preparation..."
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-gray-800 text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Result / Outcome (Optional)</label>
                    <textarea 
                      rows={6} placeholder="Student response, future goals..."
                      value={formData.outcome} onChange={e => setFormData({...formData, outcome: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-gray-800 text-sm resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddForm(false); setEditingMeeting(null); resetForm(); }}
                    className="px-6 py-3 mr-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" disabled={isSaving}
                    className="px-8 py-3 bg-brand-blue text-white rounded-xl font-bold shadow-lg shadow-brand-blue/30 hover:bg-brand-lightBlue transition-all disabled:opacity-70"
                  >
                    {isSaving ? 'Saving Record...' : editingMeeting ? 'Update Record' : 'Save Meeting Record'}
                  </button>
                </div>
              </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <Filter className="w-5 h-5 text-gray-400 ml-2" />
        <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none text-gray-700">
          <option value="All-Time">All-Time</option>
          <option value="Today">Today</option>
          <option value="This Month">This Month</option>
        </select>
        
        <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none text-gray-700 max-w-[200px]">
          <option value="">All Students</option>
          {mentees.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
        </select>

        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none text-gray-700">
          <option value="">All Types</option>
          {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* History Table / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div></div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <ListTodo className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold text-lg">No meeting records found.</p>
          </div>
        ) : (
          filteredMeetings.map((meet, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              key={meet.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Left Col: Meta */}
                <div className="lg:w-1/4 flex flex-col gap-3 border-b lg:border-b-0 lg:border-r border-gray-100 pb-4 lg:pb-0 pr-4">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase bg-blue-50 text-brand-blue border border-blue-100 mb-2">
                      {meet.purpose === 'Other' ? meet.otherPurpose : meet.purpose}
                    </span>
                  </div>
                  <div className="flex items-center text-sm font-bold text-gray-700">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {new Date(meet.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="flex items-center text-sm font-bold text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    {meet.location === 'Other' ? meet.otherLocation : meet.location}
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Attended ({meet.studentIds.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {meet.studentIds.length === mentees.length ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">All Students</span>
                      ) : (
                        meet.studentIds.map(id => {
                          const s = mentees.find(m => m.id === id);
                          if (!s) return null;
                          return <span key={id} className="text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 truncate max-w-[120px]" title={s.fullName}>{s.fullName.split(' ')[0]}</span>
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Col: Content */}
                <div className="lg:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{meet.description}</p>
                  </div>
                  {meet.outcome && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Outcome</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{meet.outcome}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Corner */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(meet)} className="p-2 text-gray-400 hover:text-brand-blue bg-white hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(meet)} className="p-2 text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

    </div>
  );
};

export default MeetingRecords;
