import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle, User, Hash, School, Loader2 } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const CLASS_OPTIONS = [
  'Secondary Final Year',
  'Senior Secondary First Year',
  'Senior Secondary Final Year',
  'Degree First Year'
];

const ApplyOpportunityModal = ({ isOpen, onClose, opportunity, studentData }) => {
  const [formData, setFormData] = useState({
    name: '',
    admissionNumber: '',
    className: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (studentData) {
      setFormData({
        name: studentData.fullName || '',
        admissionNumber: studentData.admissionNumber || '',
        className: studentData.className || ''
      });
    } else {
      setFormData({ name: '', admissionNumber: '', className: '' });
    }
  }, [studentData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.admissionNumber || !formData.className) {
      setError('Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'applications'), {
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        ...formData,
        status: 'pending',
        appliedAt: serverTimestamp()
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error(err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Send className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-gray-900 leading-none">Apply for Program</h2>
                <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{opportunity.title}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-200/50 rounded-full hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {success ? (
            <div className="py-10 text-center space-y-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-12 h-12" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Application Sent!</h3>
                <p className="text-gray-500 mt-2">Your application has been submitted successfully.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-blue transition-colors" />
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-medium"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Admission Number</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-blue transition-colors" />
                    <input 
                      type="text" 
                      value={formData.admissionNumber}
                      onChange={e => setFormData({...formData, admissionNumber: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-medium"
                      placeholder="e.g. 1001"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Select Class</label>
                  <div className="relative">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-blue transition-colors" />
                    <select 
                      value={formData.className}
                      onChange={e => setFormData({...formData, className: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-medium appearance-none"
                    >
                      <option value="">Select your class...</option>
                      {CLASS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-blue text-white py-4.5 rounded-[1.25rem] font-bold shadow-xl shadow-brand-blue/20 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 h-16"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span className="text-lg">Submit Application</span>
                    <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ApplyOpportunityModal;
