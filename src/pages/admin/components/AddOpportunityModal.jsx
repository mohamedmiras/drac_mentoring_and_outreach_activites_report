import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UploadCloud, Plus, Trash2 } from 'lucide-react';
import { processAndUploadImage } from '../../../lib/imageOptimization';

const PROGRAM_TYPES = [
  'Presentation',
  'Publication',
  'Writing',
  'Workshop',
  'Academic Seminar',
  'Contest',
  'Debate',
  'Research Project',
  'Training Program',
  'Internship',
  'Other'
];

const TARGET_STUDENT_OPTIONS = ['S5', 'SS1', 'SS2', 'D1'];

const AddOpportunityModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  
  const [targetStudents, setTargetStudents] = useState({
    all: false,
    S5: false,
    SS1: false,
    SS2: false,
    D1: false
  });

  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [link, setLink] = useState('');
  const [ageLimit, setAgeLimit] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [currentPosterURL, setCurrentPosterURL] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setType(initialData.type || '');
      setDescription(initialData.description || '');
      setDate(initialData.date || '');
      setVenue(initialData.venue || '');
      setDeadline(initialData.deadline || '');
      setLink(initialData.link || '');
      setAgeLimit(initialData.ageLimit || '');
      setCurrentPosterURL(initialData.posterURL || '');
      
      const targets = { all: false, S5: false, SS1: false, SS2: false, D1: false };
      if (initialData.targetStudents?.includes('All Students')) {
        targets.all = true;
        targets.S5 = targets.SS1 = targets.SS2 = targets.D1 = true;
      } else if (initialData.targetStudents) {
        initialData.targetStudents.forEach(t => { if (targets.hasOwnProperty(t)) targets[t] = true; });
      }
      setTargetStudents(targets);
    } else {
      // Reset
      setTitle(''); setType(''); setDescription(''); setDate(''); setVenue(''); setDeadline(''); setLink(''); setAgeLimit(''); setPosterFile(null); setCurrentPosterURL('');
      setTargetStudents({ all: false, S5: false, SS1: false, SS2: false, D1: false });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleTargetChange = (option) => {
    if (option === 'all') {
      const newValue = !targetStudents.all;
      setTargetStudents({
        all: newValue,
        S5: newValue,
        SS1: newValue,
        SS2: newValue,
        D1: newValue
      });
    } else {
      setTargetStudents(prev => {
        const next = { ...prev, [option]: !prev[option] };
        next.all = next.S5 && next.SS1 && next.SS2 && next.D1;
        return next;
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setPosterFile(e.target.files[0]);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!deadline) newErrors.deadline = 'Deadline is required.';
    else if (deadline < today) newErrors.deadline = 'Deadline cannot be in the past.';
    
    if (date && date < today) newErrors.date = 'Program date cannot be in the past.';

    if (!posterFile && !currentPosterURL) newErrors.posterFile = 'Poster attachment is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      let posterURL = currentPosterURL;
      if (posterFile) {
        posterURL = await processAndUploadImage(posterFile, 'opportunities');
      }

      const selectedTargets = Object.entries(targetStudents)
        .filter(([key, val]) => val && key !== 'all')
        .map(([key]) => key);

      const payload = {
        title: title || 'Untitled Opportunity',
        type: type || 'Other',
        description,
        targetStudents: targetStudents.all ? ['All Students'] : selectedTargets,
        date,
        venue,
        deadline,
        link,
        ageLimit,
        posterURL,
        createdAt: initialData?.createdAt || new Date().toISOString()
      };

      await onSave(payload, initialData?.id);
    } catch (err) {
      console.error(err);
      alert('Error saving opportunity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Opportunity' : 'Add New Opportunity'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-red-100 hover:text-red-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Program Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Science Fair 2026" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Program Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm bg-white">
                <option value="">Select Type...</option>
                {PROGRAM_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief details about the program..." rows="3" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm resize-none"></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Eligibility / Target Students</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <label className="col-span-2 sm:col-span-1 flex items-center space-x-2 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors bg-blue-50/30 border-blue-100">
                  <input type="checkbox" checked={targetStudents.all} onChange={() => handleTargetChange('all')} className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                  <span className="text-sm font-bold text-brand-blue">All Students</span>
                </label>
                {TARGET_STUDENT_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center space-x-2 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={targetStudents[opt]} onChange={() => handleTargetChange(opt)} className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                    <span className="text-sm font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                <input 
                  type="date" 
                  value={date} 
                  min={today}
                  onChange={e => { setDate(e.target.value); setErrors(prev => ({...prev, date: null}))}} 
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm ${errors.date ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Venue / Mode</label>
                <select value={venue} onChange={e => setVenue(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm bg-white">
                  <option value="">Select Venue/Mode...</option>
                  <option value="Offline">Offline</option>
                  <option value="Online">Online</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Deadline to Apply <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={deadline} 
                  min={today}
                  onChange={e => { setDeadline(e.target.value); setErrors(prev => ({...prev, deadline: null}))}} 
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm ${errors.deadline ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                />
                {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Age Limit</label>
                <input type="text" value={ageLimit} onChange={e => setAgeLimit(e.target.value)} placeholder="e.g. 15-20" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Registration Link</label>
                <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Attachment / Poster Upload <span className="text-red-500">*</span></label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-brand-blue transition bg-gray-50">
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-blue hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-blue">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,application/pdf" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                  {posterFile && <p className="text-sm font-bold text-brand-green mt-2">{posterFile.name}</p>}
                </div>
              </div>
              {errors.posterFile && <p className="text-red-500 text-xs mt-1">{errors.posterFile}</p>}
            </div>

          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition flex items-center disabled:opacity-50">
            {loading ? 'Saving...' : initialData ? 'Update Opportunity' : 'Publish Opportunity'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddOpportunityModal;
