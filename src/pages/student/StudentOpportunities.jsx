import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Calendar, Search, MapPin, Users, Download, ExternalLink, Clock, FileText, Send } from 'lucide-react';
import ApplyOpportunityModal from './components/ApplyOpportunityModal';

const StudentOpportunitiesTab = ({ student, isPublic = false }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'opportunities'));
      const data = [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      snap.forEach(d => {
        const item = { id: d.id, ...d.data() };
        let deadlineDate = new Date(0);
        if (item.deadline) {
          const parts = item.deadline.split('-');
          if (parts.length === 3) {
            deadlineDate = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            deadlineDate = new Date(item.deadline);
          }
        }
        deadlineDate.setHours(0, 0, 0, 0);
        // Only show active opportunities
        if (deadlineDate >= now) {
          data.push(item);
        }
      });
      data.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0)); // Sort by closest deadline
      setOpportunities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = (opp.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (opp.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter ? opp.type === typeFilter : true;
    
    // Check eligibility based on student data
    let eligible = true;
    if (!isPublic && opp.targetStudents && Array.isArray(opp.targetStudents) && opp.targetStudents.length > 0 && !opp.targetStudents.includes('All Students')) {
      let classLevel = '';
      if (student?.className) {
        const name = student.className.toLowerCase();
        if (name.includes('secondary final')) classLevel = 'S5';
        else if (name.includes('senior secondary first')) classLevel = 'SS1';
        else if (name.includes('senior secondary final')) classLevel = 'SS2';
        else if (name.includes('degree first')) classLevel = 'D1';
      }
      
      if (classLevel && !opp.targetStudents.includes(classLevel)) {
        eligible = false;
      } else if (!classLevel) {
        eligible = false; // Hide if we can't map their class and it's restricted
      }
    }
    
    return matchesSearch && matchesType && eligible;
  });

  const uniqueTypes = [...new Set(opportunities.map(o => o.type).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none" />
        <h3 className="text-2xl font-black text-gray-900 mb-6 relative z-10 flex items-center">
          <Calendar className="w-7 h-7 mr-3 text-brand-blue" />
          Active Opportunities
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search programs, topics..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition"
            />
          </div>
          <select 
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-full sm:w-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition"
          >
            <option value="">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No opportunities found</h3>
          <p className="text-gray-500 mt-2">Check back later for new programs and events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOpportunities.map((opp, idx) => (
            <motion.div 
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col"
            >
              {opp.posterURL && (
                <div className="h-48 w-full bg-gray-100 overflow-hidden relative">
                  <img src={opp.posterURL} alt={opp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                <h4 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{opp.title}</h4>
                
                {opp.description && (
                  <p className="text-gray-600 text-sm mb-5 line-clamp-3">{opp.description}</p>
                )}
                
                <div className="space-y-3 mb-6 mt-auto">
                  <div className="flex items-center text-sm text-gray-700">
                    <FileText className="w-4 h-4 mr-3 text-gray-400" />
                    Program Type: <span className="font-medium ml-1">{opp.type}</span>
                  </div>
                  {opp.date && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                      {new Date(opp.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  )}
                  {opp.venue && (
                    <div className="flex items-center text-sm text-gray-700">
                      <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                      {opp.venue}
                    </div>
                  )}
                  {opp.targetStudents && Array.isArray(opp.targetStudents) && opp.targetStudents.length > 0 && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Users className="w-4 h-4 mr-3 text-gray-400" />
                      Eligibility: <span className="font-medium ml-1">{opp.targetStudents.join(', ')}</span>
                    </div>
                  )}
                  {opp.ageLimit && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Clock className="w-4 h-4 mr-3 text-gray-400" />
                      Age Limit: <span className="font-medium ml-1">{opp.ageLimit} Years</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm font-bold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">
                    <Clock className="w-4 h-4 mr-2" />
                    Deadline: {new Date(opp.deadline).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 w-full">
                    {opp.posterURL && (
                      <a 
                        href={opp.posterURL}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex justify-center items-center bg-brand-blue text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-brand-blue/10"
                        title="Download Poster"
                      >
                        <Download className="w-4 h-4 mr-2" /> Download Poster
                      </a>
                    )}
                    <button 
                      onClick={() => { setSelectedOpp(opp); setIsApplyModalOpen(true); }}
                      className={`flex justify-center items-center px-4 py-3 rounded-xl font-bold transition shadow-sm ${!opp.posterURL ? 'flex-1 bg-brand-blue text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      <Send className="w-4 h-4 mr-2" /> Apply
                    </button>
                  </div>
                  {opp.link && (
                    <a 
                      href={opp.link.startsWith('http') ? opp.link : `https://${opp.link}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex justify-center items-center text-brand-blue font-bold text-sm hover:underline py-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Official Website
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <ApplyOpportunityModal 
        isOpen={isApplyModalOpen}
        onClose={() => { setIsApplyModalOpen(false); setSelectedOpp(null); }}
        opportunity={selectedOpp || {}}
        studentData={student}
      />
    </div>
  );
};

export default StudentOpportunitiesTab;
