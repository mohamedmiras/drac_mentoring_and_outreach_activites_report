import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Plus, Trash2, Calendar, Link as LinkIcon, Users, MapPin, Clock, FileText, Pencil } from 'lucide-react';
import AddOpportunityModal from './components/AddOpportunityModal';
import AppliedStudentsModal from './components/AppliedStudentsModal';

const Opportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [selectedOppForApplicants, setSelectedOppForApplicants] = useState(null);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'opportunities'));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      
      // Auto-delete if deadline expired 5 days ago
      const now = new Date();
      const validData = [];
      for (const item of data) {
        const deadlineDate = new Date(item.deadline);
        const diffDays = (now - deadlineDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 5) {
          await deleteDoc(doc(db, 'opportunities', item.id));
        } else {
          validData.push(item);
        }
      }
      
      validData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOpportunities(validData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpportunity = async (payload, id) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'opportunities', id), payload);
      } else {
        await addDoc(collection(db, 'opportunities'), payload);
      }
      setIsModalOpen(false);
      setEditingOpportunity(null);
      fetchOpportunities();
    } catch (err) {
      console.error(err);
      alert('Failed to save opportunity');
    }
  };

  const handleEdit = (opp) => {
    setEditingOpportunity(opp);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;
    try {
      await deleteDoc(doc(db, 'opportunities', id));
      setOpportunities(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const now = new Date();
  const activeCount = opportunities.filter(o => new Date(o.deadline) >= now).length;
  const expiredCount = opportunities.filter(o => new Date(o.deadline) < now).length;
  const totalCount = opportunities.length;

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-gray-500 mt-1">Manage and publish opportunities for students.</p>
        </div>
        <button 
          onClick={() => { setEditingOpportunity(null); setIsModalOpen(true); }}
          className="bg-brand-blue text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-700 transition shadow-lg shadow-brand-blue/30 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Opportunity
        </button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Posted</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{totalCount}</p>
        </div>
        <div className="bg-gradient-to-br from-brand-green to-green-600 rounded-2xl shadow-md p-6 text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-white/80">Active Programs</p>
          <p className="text-3xl font-black mt-2">{activeCount}</p>
        </div>
        <div className="bg-gray-100 rounded-2xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Expired</p>
          <p className="text-3xl font-black text-gray-700 mt-2">{expiredCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No opportunities posted</h3>
          <p className="text-gray-500 mt-2">Click the Add Opportunity button to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {opportunities.map((opp, idx) => {
            const isExpired = new Date(opp.deadline) < now;
            return (
              <motion.div 
                key={opp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-white rounded-2xl border ${isExpired ? 'border-red-200 opacity-75' : 'border-gray-100 shadow-sm hover:shadow-xl'} overflow-hidden flex flex-col group transition-all duration-300`}
              >
                {opp.posterURL ? (
                  <div className="h-48 bg-gray-100 w-full overflow-hidden relative">
                    <img src={opp.posterURL} alt={opp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {isExpired && (
                      <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full uppercase tracking-widest text-xs">Expired</span>
                      </div>
                    )}
                  </div>
                ) : (
                   <div className="h-16 bg-gradient-to-r from-brand-blue/10 to-brand-green/10" />
                )}
                <div className="p-6 flex flex-col flex-1 relative">
                  <div className="flex justify-between items-start mb-2 pr-20">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{opp.title}</h3>
                    <div className="absolute top-6 right-6 flex gap-1">
                      <button 
                        onClick={() => { setSelectedOppForApplicants(opp); setIsApplicantsModalOpen(true); }}
                        className="p-2 text-gray-400 hover:text-brand-green hover:bg-green-50 rounded-lg transition"
                        title="View Applied Students"
                      >
                        <Users className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleEdit(opp)} className="p-2 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(opp.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-brand-blue mb-4 uppercase tracking-wider">{opp.type}</p>
                  
                  {opp.description && (
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">{opp.description}</p>
                  )}
                  
                  <div className="mt-auto space-y-2">
                    {opp.targetStudents && opp.targetStudents.length > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2 text-gray-400" /> 
                        <span className="font-medium">{opp.targetStudents.join(', ')}</span>
                      </div>
                    )}
                    {opp.venue && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" /> 
                        {opp.venue}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2 text-red-400" /> 
                      <span className={`${isExpired ? 'text-red-500 font-bold' : ''}`}>Deadline: {new Date(opp.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddOpportunityModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingOpportunity(null); }}
        onSave={handleSaveOpportunity}
        initialData={editingOpportunity}
      />
      <AppliedStudentsModal 
        isOpen={isApplicantsModalOpen}
        onClose={() => { setIsApplicantsModalOpen(false); setSelectedOppForApplicants(null); }}
        opportunity={selectedOppForApplicants || {}}
      />
    </AdminLayout>
  );
};

export default Opportunities;
