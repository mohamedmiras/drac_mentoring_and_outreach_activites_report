import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Download, FileText, Search, User, Hash, School, Calendar } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const AppliedStudentsModal = ({ isOpen, onClose, opportunity }) => {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    console.log("AppliedStudentsModal State:", { isOpen, oppId: opportunity?.id });
    if (isOpen && opportunity?.id) {
      fetchApplicants();
    }
  }, [isOpen, opportunity]);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'applications'), 
        where('opportunityId', '==', opportunity.id)
      );
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      
      // Sort locally by appliedAt desc
      data.sort((a, b) => {
        const timeA = a.appliedAt?.toMillis ? a.appliedAt.toMillis() : 0;
        const timeB = b.appliedAt?.toMillis ? b.appliedAt.toMillis() : 0;
        return timeB - timeA;
      });

      setApplicants(data);
    } catch (err) {
      console.error("Fetch applicants error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getClassCode = (className) => {
    if (!className) return '';
    const map = {
      'secondary final year': 'S5',
      'senior secondary first year': 'SS1',
      'senior secondary final year': 'SS2',
      'degree first year': 'D1'
    };
    return map[className.toLowerCase()] || className;
  };

  const exportToCSV = () => {
    if (applicants.length === 0) return;
    
    const headers = ['Name', 'Admission Number', 'Class', 'Applied Date'];
    const rows = applicants.map(app => [
      app.name,
      app.admissionNumber,
      getClassCode(app.className),
      app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Applicants_${opportunity.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredApplicants = applicants.filter(app => 
    (app.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">Applied Students</h2>
              <p className="text-sm text-gray-500 font-medium">{opportunity.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {applicants.length > 0 && (
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl font-bold hover:bg-green-600 transition shadow-lg shadow-green-500/20"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
             )}
             <button onClick={onClose} className="p-2 bg-gray-200/50 rounded-full hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
                <X className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-8">
           <div className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name or admission number..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-medium"
              />
           </div>

           <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 shadow-inner bg-gray-50/30">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
                   <p className="text-gray-500 font-bold animate-pulse">Fetching applicants...</p>
                </div>
              ) : filteredApplicants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                   <Users className="w-16 h-16 opacity-20 mb-4" />
                   <p className="text-lg font-bold">No applications found</p>
                   {searchTerm && <p className="text-sm">Try adjusting your search</p>}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 bg-white border-b border-gray-100 z-10 shadow-sm">
                      <tr>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Admission No</th>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Class</th>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Applied On</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredApplicants.map((app) => (
                        <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                           <td className="px-6 py-5">
                              <span className="font-bold text-gray-900">{app.name}</span>
                           </td>
                           <td className="px-6 py-5">
                              <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-black text-gray-600 border border-gray-200">
                                 {app.admissionNumber}
                              </span>
                           </td>
                           <td className="px-6 py-5">
                              <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-2.5 py-1 rounded-lg border border-brand-blue/10 uppercase tracking-widest">
                                 {getClassCode(app.className)}
                              </span>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center text-xs font-bold text-gray-400">
                                 <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                 {app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              )}
           </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs font-bold text-gray-400">
           <p>{filteredApplicants.length} Applicants found</p>
           <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AppliedStudentsModal;
