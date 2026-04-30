import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Upload, ArrowRight, Save, Navigation, RefreshCcw, Pencil } from 'lucide-react';
import { processAndUploadImage } from '../../../lib/imageOptimization';
import { calculateEntryScore, GRADE_POINTS } from '../../../lib/scoring';

const TYPE_OPTIONS = {
  'Publication': ['Poem', 'Story', 'Short Story', 'Article', 'Essay', 'Letter', 'Opinion Piece', 'Research Note', 'Review', 'Blog Writing', 'Other'],
  'Presentation': ['National', 'International', 'Local', 'Virtual', 'Union', 'Inter-Class', 'Institutional', 'Other'],
  'Abstract': [],
  'Workshop / Seminar Attendance': [],
  'Contest': [],
  'Poster': ['Campus Union', 'Class Union', 'Marketing Agency', 'Institutional Agency', 'Academic Department', 'Student Club', 'NGO / Social Group', 'Event Committee', 'Other'],
  'Public Speech': ['Union', 'Local Masjid Speech', 'Community Event', 'Institutional Program', 'Debate Stage', 'Awareness Program', 'Other'],
  'Web Development': [],
  'Drawing': ['Sketch', 'Digital Art', 'Painting', 'Calligraphy', 'Illustration', 'Other'],
  'Song': ['Qawwali', 'Mashup', 'Burda', 'Group Song', 'Mahfile Ishq', 'Mappila Pattu', 'Other'],
  'Other': [],
};

const GRADE_OPTIONS = ['Good', 'Very Good', 'Well Done', 'Excellent', 'Outstanding'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 20 }, (_, i) => (new Date().getFullYear() - 15 + i).toString()).filter(y => parseInt(y) <= new Date().getFullYear());

const AddAchievementModal = ({ isOpen, onClose, onSave, uploading, initialData = null }) => {
  const isEditing = !!initialData;
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Form State
  const [type, setType] = useState('');
  const [specificType, setSpecificType] = useState('');
  const [customType, setCustomType] = useState('');
  const [conductedInstitution, setConductedInstitution] = useState('');
  const [dateOfProgram, setDateOfProgram] = useState(new Date().toISOString().split('T')[0]);
  const [websiteName, setWebsiteName] = useState('');
  const [websiteURL, setWebsiteURL] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [existingPhotoURL, setExistingPhotoURL] = useState('');
  const [language, setLanguage] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [pubMonth, setPubMonth] = useState(MONTHS[new Date().getMonth()]);
  const [pubYear, setPubYear] = useState(new Date().getFullYear().toString());
  const [pubDay, setPubDay] = useState(new Date().getDate().toString());

  // Contest Specific State
  const [contestGrade, setContestGrade] = useState('');
  const [marksObtained, setMarksObtained] = useState('');
  const [marksOutOf, setMarksOutOf] = useState('');
  const [contestLevel, setContestLevel] = useState('');
  const [contestName, setContestName] = useState('');
  const [isContestMode, setIsContestMode] = useState(false);
  const [contestRank, setContestRank] = useState('');
  const [contestPrize, setContestPrize] = useState('');
  const [contestSelection, setContestSelection] = useState('');
  const [candidatesSelectedCount, setCandidatesSelectedCount] = useState('');
  const [candidatesTotalCount, setCandidatesTotalCount] = useState('');
  const [isParticipationOnly, setIsParticipationOnly] = useState(false);

  // Song Specific State
  const [songPlatform, setSongPlatform] = useState('Offline');
  const [songTeamName, setSongTeamName] = useState('');
  const [songCustomTeam, setSongCustomTeam] = useState('');

  // Workshop Specific State
  const [workshopTitle, setWorkshopTitle] = useState('');
  const [workshopProgram, setWorkshopProgram] = useState('');
  const [workshopOrganizer, setWorkshopOrganizer] = useState('');
  const [workshopVenue, setWorkshopVenue] = useState('');

  // Evaluation State
  const [stars, setStars] = useState(0);
  const [grade, setGrade] = useState('Excellent');
  const [marks, setMarks] = useState(8.0);
  const [isOutreach, setIsOutreach] = useState(false);
  const [isMission100, setIsMission100] = useState(false);
  const [presentedAsPaper, setPresentedAsPaper] = useState(false);
  
  const [internalLoading, setInternalLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const scrollContainerRef = useRef(null);

  React.useEffect(() => {
    if (isOpen && initialData) {
      setType(initialData.type || '');
      
      const possibleSubtypes = TYPE_OPTIONS[initialData.type] || [];
      if (initialData.specificType && !possibleSubtypes.includes(initialData.specificType)) {
        setSpecificType('Other');
        setCustomType(initialData.specificType);
      } else {
        setSpecificType(initialData.specificType || '');
        setCustomType('');
      }

      setConductedInstitution(initialData.conductedInstitution || '');
      
      if (initialData.date) {
        const parts = initialData.date.split('-');
        if (parts.length === 3) {
          setPubYear(parts[0]);
          setPubMonth(MONTHS[parseInt(parts[1]) - 1]);
          setPubDay(parts[2]);
          setDateOfProgram(initialData.date);
        } else if (parts.length === 2) {
          setPubYear(parts[0]);
          setPubMonth(MONTHS[parseInt(parts[1]) - 1]);
          setPubDay('');
          setDateOfProgram(initialData.date);
        }
      } else {
        setPubDay(''); setPubMonth(''); setPubYear(''); setDateOfProgram('');
      }
      
      setWebsiteName(initialData.websiteName || '');
      setWebsiteURL(initialData.websiteURL || '');
      setDescription(initialData.note || '');
      setExistingPhotoURL(initialData.photoURL || '');
      setStars(initialData.stars || 0);
      setGrade(initialData.grade || 'Excellent');
      setMarks(initialData.marks !== undefined ? initialData.marks : 8.0);
      setIsOutreach(initialData.isOutreach || false);
      setIsMission100(initialData.isMission100 || false);
      setPresentedAsPaper(initialData.presentedAsPaper || false);
      
      if (initialData.type === 'Contest') {
        setContestGrade(initialData.grade || '');
        if (typeof initialData.marks === 'string' && initialData.marks.includes('/')) {
           const [obt, out] = initialData.marks.split('/');
           setMarksObtained(obt);
           setMarksOutOf(out);
        }
      }
      if (initialData.type === 'Workshop / Seminar Attendance') {
        setWorkshopTitle(initialData.title || '');
        setWorkshopProgram(initialData.specificType || '');
        setWorkshopOrganizer(initialData.conductedInstitution || '');
        setWorkshopVenue(initialData.venue || '');
      }

      const languages = ['Malayalam', 'English', 'Urdu', 'Arabic', 'Hindi'];
      if (initialData.language && !languages.includes(initialData.language)) {
        setLanguage('Other');
        setCustomLanguage(initialData.language);
      } else {
        setLanguage(initialData.language || '');
        setCustomLanguage('');
      }

      setStep(1);
    } else if (isOpen) {
      setType(''); setSpecificType(''); setCustomType(''); setConductedInstitution(''); 
      setDateOfProgram(new Date().toISOString().split('T')[0]);
      setWebsiteName(''); setWebsiteURL(''); setDescription(''); setPhotoFile(null); setExistingPhotoURL('');
      setStars(0); setGrade('Excellent'); setMarks(8.0); setLanguage(''); setCustomLanguage('');
      setIsOutreach(false); setIsMission100(false); setPresentedAsPaper(false);
      setPubMonth(MONTHS[new Date().getMonth()]); 
      setPubYear(new Date().getFullYear().toString()); 
      setPubDay(new Date().getDate().toString());
      setContestGrade(''); setMarksObtained(''); setMarksOutOf('');
      setContestLevel(''); setContestName('');
      setIsContestMode(false); setContestRank(''); setContestPrize(''); setContestSelection('');
      setCandidatesSelectedCount(''); setCandidatesTotalCount(''); setIsParticipationOnly(false);
      setSongPlatform('Offline'); setSongTeamName(''); setSongCustomTeam('');
      setWorkshopTitle(''); setWorkshopProgram(''); setWorkshopOrganizer(''); setWorkshopVenue('');
      setStep(1);
    }
    setError(''); setPhotoError(false); setFieldErrors({});
  }, [isOpen, initialData]);

  const getDaysInMonth = (m, y) => {
    if (!m) return 31;
    const monthIndex = MONTHS.indexOf(m);
    if (monthIndex === -1) return 31;
    const yearNum = parseInt(y) || new Date().getFullYear();
    return new Date(yearNum, monthIndex + 1, 0).getDate();
  };

  React.useEffect(() => {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const currDay = now.getDate();

    if (parseInt(pubYear) === currYear && MONTHS.indexOf(pubMonth) > currMonth) {
      setPubMonth(''); setPubDay('');
    }
    if (parseInt(pubYear) === currYear && MONTHS.indexOf(pubMonth) === currMonth && parseInt(pubDay) > currDay) {
      setPubDay('');
    }
    const maxDays = getDaysInMonth(pubMonth, pubYear);
    if (pubDay && parseInt(pubDay) > maxDays) {
      setPubDay('');
    }
  }, [pubMonth, pubYear, pubDay]);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  if (!isOpen) return null;

  const validateStep1 = () => {
    const newErrors = {};
    if (!type) newErrors.type = 'Achievement category is required.';
    
    if (type && TYPE_OPTIONS[type]?.length > 0 && !specificType) {
      newErrors.specificType = 'Please select a specific type.';
    }
    
    if ((specificType === 'Other' || type === 'Other') && !customType.trim() && type !== 'Contest' && type !== 'Workshop / Seminar Attendance') {
      newErrors.customType = type === 'Other' ? 'Please specify the achievement category.' : 'Please specify the exact type details.';
    }

    if (type === 'Contest') {
      if (!contestName.trim()) newErrors.contestName = 'Contest Name is required.';
      if (!contestGrade) newErrors.contestGrade = 'Grade/Result is required.';
      if (!dateOfProgram) newErrors.dateOfProgram = 'Date is required.';
    } else if (type === 'Workshop / Seminar Attendance') {
      if (!workshopProgram.trim()) newErrors.workshopProgram = 'Program Name is required.';
      if (!workshopOrganizer.trim()) newErrors.workshopOrganizer = 'Organizer is required.';
      if (!dateOfProgram) newErrors.dateOfProgram = 'Date is required.';
    } else if (['Publication', 'Presentation', 'Abstract'].includes(type)) {
      if ((type === 'Presentation' || (type === 'Abstract' && presentedAsPaper)) && !conductedInstitution.trim()) {
        newErrors.conductedInstitution = 'Institution name is required.';
      }
      // Date is required for Publication and Presentation, but optional for Abstract
      if (type !== 'Abstract' && (!pubMonth || !pubYear)) {
        newErrors.pubDate = 'Month and Year are required.';
      }
    } else if (['Public Speech'].includes(type)) {
      if (type !== 'Public Speech' && !conductedInstitution.trim()) {
        newErrors.conductedInstitution = 'Institution name is required.';
      }
      if (!dateOfProgram) newErrors.dateOfProgram = 'Program date is required.';
    }

    if (type === 'Web Development') {
      if (!websiteName.trim()) newErrors.websiteName = 'Website name is required.';
      if (!websiteURL.trim()) newErrors.websiteURL = 'Website URL is required.';
      else {
        try { new URL(websiteURL); } catch (err) { newErrors.websiteURL = 'Enter a valid URL.'; }
      }
    }

    if (photoFile && photoFile.size > 300 * 1024) {
      newErrors.photoFile = 'Photo exceeds the 300 KB limit.';
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (type !== 'Contest' && type !== 'Workshop / Seminar Attendance' && stars === 0) {
      setFieldErrors(prev => ({...prev, stars: 'Please award at least 1 star.'}));
      setError("Please fill in all required fields highlighted below.");
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setInternalLoading(true);
    try {
      const photoURL = photoFile ? await processAndUploadImage(photoFile, 'achievement') : (existingPhotoURL || '');

      const finalSpecificType = specificType === 'Other' ? customType : specificType;
      
      // Calculate marks based on new formula
      const selectedGrade = type === 'Contest' ? (contestGrade || grade) : grade;
      const selectedStars = type === 'Workshop / Seminar Attendance' ? (stars || 5) : stars;
      const scores = calculateEntryScore(selectedGrade, selectedStars);
      
      const payload = {
        title: type === 'Workshop / Seminar Attendance' ? workshopProgram : (type === 'Contest' ? `${contestName}${contestLevel ? ` (${contestLevel})` : ''}` : `${presentedAsPaper ? 'Presentation' : type}${finalSpecificType ? ` - ${finalSpecificType}` : ''}`),
        type: presentedAsPaper ? 'Presentation' : type,
        specificType: type === 'Workshop / Seminar Attendance' ? workshopOrganizer : (type === 'Contest' ? (finalSpecificType || 'Contest') : finalSpecificType),
        conductedInstitution: type === 'Workshop / Seminar Attendance' ? workshopOrganizer : (['Presentation'].includes(presentedAsPaper ? 'Presentation' : type) ? conductedInstitution : null),
        venue: null,
        date: (() => {
          if (['Publication', 'Presentation', 'Abstract'].includes(type)) {
            const monthIdx = (MONTHS.indexOf(pubMonth) + 1).toString().padStart(2, '0');
            return pubDay ? `${pubYear}-${monthIdx}-${pubDay.padStart(2, '0')}` : `${pubYear}-${monthIdx}`;
          } else if (['Public Speech', 'Workshop / Seminar Attendance', 'Contest'].includes(type)) {
            return dateOfProgram || new Date().toISOString().split('T')[0]; 
          } else {
            return new Date().toISOString().split('T')[0];
          }
        })(),
        websiteName: type === 'Web Development' ? websiteName : null,
        websiteURL: type === 'Web Development' ? websiteURL : null,
        note: description,
        photoURL: photoURL || existingPhotoURL,
        language: language === 'Other' ? customLanguage : language,
        stars: selectedStars,
        grade: selectedGrade,
        // Store new numeric fields
        performancePoints: scores.performancePoints,
        starPoints: scores.starPoints,
        netPoints: scores.netPoints,
        totalMarks: type === 'Workshop / Seminar Attendance' ? (marks || scores.totalMarks) : marks,
        // Keep 'marks' field for compatibility, using the new totalMarks
        marks: type === 'Contest' && marksObtained ? `${marksObtained}/${marksOutOf || 100}` : (type === 'Workshop / Seminar Attendance' ? (marks || scores.totalMarks) : marks),
        
        // Contest Details
        contestLevel: type === 'Contest' ? contestLevel : null,
        contestName: type === 'Contest' ? contestName : null,
        songPlatform: type === 'Song' ? songPlatform : null,
        songTeamName: type === 'Song' ? (songTeamName === 'Other' ? songCustomTeam : songTeamName) : null,
        
        // Contest Results
        isContestMode: isContestMode || type === 'Contest',
        contestPrize: isContestMode || type === 'Contest' ? contestPrize : null,
        contestSelection: isContestMode || type === 'Contest' ? contestSelection : null,
        candidatesSelectedCount: isContestMode || type === 'Contest' ? candidatesSelectedCount : null,
        candidatesTotalCount: isContestMode || type === 'Contest' ? candidatesTotalCount : null,
        isParticipationOnly: (isContestMode || type === 'Contest') && contestGrade === 'Participation Only',

        isOutreach,
        outreachStatus: isMission100 ? 'Accepted' : (isOutreach ? (isEditing && initialData?.outreachStatus ? initialData.outreachStatus : 'Pending') : null),
        isMission100,
        presentedAsPaper,
        createdAt: new Date().toISOString()
      };

      await onSave(payload);
    } catch (err) {
      setError(err.message || "Failed to process achievement");
    } finally {
      setInternalLoading(false);
    }
  };

  const handleNext = async (e) => {
    if (e) e.preventDefault();
    const isValid = validateStep1();
    if (!isValid) {
      setError('Please fill in all required fields highlighted below.');
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    
    if (false) { // Never skip evaluation step now
    } else {
      setStep(2);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[1.5rem] sm:rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden"
      >
        <div className="px-6 sm:px-8 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{isEditing ? 'Edit Achievement' : 'Add Achievement'}</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 font-medium tracking-wide uppercase">
              Step {step} of 2: {step === 1 ? 'Details' : 'Teacher Evaluation'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollContainerRef} className="p-6 sm:px-8 overflow-y-auto overscroll-contain touch-pan-y">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                
                {/* 1. Primary Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Achievement Category <span className="text-red-500">*</span></label>
                  <select 
                    value={type} 
                    onChange={e => { setType(e.target.value); setSpecificType(''); setCustomType(''); setFieldErrors(prev => ({...prev, type: null})); }}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white transition hover:border-gray-300 shadow-sm ${fieldErrors.type ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  >
                    <option value="" disabled>Select Category...</option>
                    {Object.keys(TYPE_OPTIONS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {fieldErrors.type && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.type}</p>}
                </div>

                {/* Level & Name for Contest Category */}
                {type === 'Contest' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Contest Level</label>
                        <select 
                          value={contestLevel} 
                          onChange={e => setContestLevel(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white transition shadow-sm"
                        >
                          <option value="">Select Level...</option>
                          <option value="Local">Local</option>
                          <option value="National">National</option>
                          <option value="International">International</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Contest Name</label>
                        <input 
                          type="text" 
                          value={contestName} 
                          onChange={e => { setContestName(e.target.value); setFieldErrors(prev => ({...prev, contestName: null})); }}
                          placeholder="e.g. State Science Fair"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white shadow-sm ${fieldErrors.contestName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        {fieldErrors.contestName && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.contestName}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. Specific Type */}
                {type && TYPE_OPTIONS[type].length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Specific Type <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {TYPE_OPTIONS[type].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => { setSpecificType(st); setFieldErrors(prev => ({...prev, specificType: null})); }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${specificType === st ? 'bg-brand-blue text-white border-brand-blue shadow-md' : fieldErrors.specificType ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.specificType && <p className="text-red-500 text-[10px] font-bold mt-2 ml-1">{fieldErrors.specificType}</p>}
                  </div>
                )}

                {/* Custom Type if 'Other' is selected as Category OR Sub-type */}
                {(type === 'Other' || (specificType === 'Other' && type !== 'Contest' && type !== 'Workshop / Seminar Attendance')) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Specify Details <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={customType} 
                      onChange={e => { setCustomType(e.target.value); setFieldErrors(prev => ({...prev, customType: null})); }} 
                      placeholder={type === 'Other' ? "Enter achievement category..." : `Specify ${type.toLowerCase()} type...`}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white shadow-sm ${fieldErrors.customType ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {fieldErrors.customType && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.customType}</p>}
                  </motion.div>
                )}

                {/* Song Specific Details */}
                {type === 'Song' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Platform</label>
                        <select 
                          value={songPlatform} 
                          onChange={e => setSongPlatform(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white transition shadow-sm"
                        >
                          <option value="Offline">Offline</option>
                          <option value="Virtual">Virtual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Team Name</label>
                        <select 
                          value={songTeamName} 
                          onChange={e => setSongTeamName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white transition shadow-sm"
                        >
                          <option value="">No Team</option>
                          <option value="Roohe Sama (Senior)">Roohe Sama (Senior)</option>
                          <option value="Roohe Sama (Junior)">Roohe Sama (Junior)</option>
                          <option value="Other">Other (Optional)</option>
                        </select>
                      </div>
                    </div>
                    {songTeamName === 'Other' && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Specify Team Name</label>
                        <input 
                          type="text" 
                          value={songCustomTeam} 
                          onChange={e => setSongCustomTeam(e.target.value)}
                          placeholder="Enter team name"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm"
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Language Dropdown for specific categories */}
                {['Publication', 'Presentation', 'Abstract', 'Public Speech', 'Workshop / Seminar Attendance', 'Contest'].includes(type) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Language</label>
                      <select 
                        value={language} 
                        onChange={e => { setLanguage(e.target.value); setFieldErrors(prev => ({...prev, language: null})); }}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white transition hover:border-gray-300 shadow-sm"
                      >
                        <option value="">Select Language...</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="English">English</option>
                        <option value="Urdu">Urdu</option>
                        <option value="Arabic">Arabic</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Other">Other (Specify)</option>
                      </select>
                    </div>

                    {language === 'Other' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Specify Language</label>
                        <input 
                          type="text" 
                          value={customLanguage} 
                          onChange={e => setCustomLanguage(e.target.value)} 
                          placeholder="e.g. French"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white shadow-sm"
                        />
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Global Contest Mode Toggle - Only for Song, Public Speech, Other, and the Contest category itself */}
                {['Song', 'Public Speech', 'Other', 'Contest'].includes(type) && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-colors ${(isContestMode || type === 'Contest') ? "bg-amber-500 text-white shadow-md shadow-amber-200" : "bg-gray-200 text-gray-400"}`}>
                          <RefreshCcw className={`w-5 h-5 ${(isContestMode || type === 'Contest') ? "animate-spin-slow" : ""}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-amber-900">Contest Participation?</p>
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Turn on for Rank & Prizes</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsContestMode(!isContestMode)}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${(isContestMode || type === 'Contest') ? "bg-amber-500" : "bg-gray-300"}`}
                        disabled={type === 'Contest'}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${(isContestMode || type === 'Contest') ? "translate-x-6" : "translate-x-0"}`} />
                      </button>
                    </div>

                    {(isContestMode || type === 'Contest') && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 overflow-hidden">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Prize / Result</label>
                          <select 
                            value={contestGrade} 
                            onChange={e => {
                              const val = e.target.value;
                              setContestGrade(val);
                              if (val && GRADE_POINTS[val]) {
                                setMarks(GRADE_POINTS[val]);
                              }
                              // Sync with contestSelection for backend compatibility if needed
                              if (val === 'Selection') {
                                setContestSelection(val);
                              } else {
                                setContestSelection('');
                              }
                            }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none bg-white shadow-sm transition"
                          >
                            <option value="">Select Result...</option>
                            <option value="First Prize">First Prize</option>
                            <option value="Second Prize">Second Prize</option>
                            <option value="Third Prize">Third Prize</option>
                            <option value="Selection">Selection</option>
                            <option value="Grade Only">Grade Only</option>
                            <option value="Participation Only">Participation Only</option>
                          </select>
                        </div>

                        {['First Prize', 'Second Prize', 'Third Prize'].includes(contestGrade) && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Total Marks</label>
                              <input 
                                type="number" 
                                value={marksObtained} 
                                onChange={e => setMarksObtained(e.target.value)} 
                                placeholder="e.g. 85" 
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none bg-white shadow-sm transition" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Out of</label>
                              <input 
                                type="number" 
                                value={marksOutOf} 
                                onChange={e => setMarksOutOf(e.target.value)} 
                                placeholder="e.g. 100" 
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none bg-white shadow-sm transition" 
                              />
                            </div>
                          </motion.div>
                        )}

                        {contestGrade === 'Selection' && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Out of (Total Candidates)</label>
                            <input 
                              type="number" 
                              value={candidatesTotalCount} 
                              onChange={e => setCandidatesTotalCount(e.target.value)} 
                              placeholder="e.g. 100" 
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none bg-white shadow-sm transition" 
                            />
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Workshop / Seminar Attendance Fields */}
                {type === 'Workshop / Seminar Attendance' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Program Name <span className="text-red-500">*</span></label>
                      <input type="text" value={workshopProgram} onChange={e => { setWorkshopProgram(e.target.value); setFieldErrors(prev => ({...prev, workshopProgram: null})); }} placeholder="e.g. Tech Symposium 2026" className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm ${fieldErrors.workshopProgram ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                      {fieldErrors.workshopProgram && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.workshopProgram}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Organizer <span className="text-red-500">*</span></label>
                      <input type="text" value={workshopOrganizer} onChange={e => { setWorkshopOrganizer(e.target.value); setFieldErrors(prev => ({...prev, workshopOrganizer: null})); }} placeholder="e.g. IT Department" className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm ${fieldErrors.workshopOrganizer ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                      {fieldErrors.workshopOrganizer && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.workshopOrganizer}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Date of Program <span className="text-red-500">*</span></label>
                      <input type="date" max={new Date().toISOString().split('T')[0]} value={dateOfProgram} onChange={e => { setDateOfProgram(e.target.value); setFieldErrors(prev => ({...prev, dateOfProgram: null})); }} className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm text-gray-700 ${fieldErrors.dateOfProgram ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                      {fieldErrors.dateOfProgram && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.dateOfProgram}</p>}
                    </div>
                  </div>
                )}

                {/* Abstract Presentation Toggle */}
                {type === 'Abstract' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue peer-checked:bg-brand-blue">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={presentedAsPaper}
                          onChange={(e) => setPresentedAsPaper(e.target.checked)}
                        />
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${presentedAsPaper ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-blue-900">Presented as Paper?</span>
                        <p className="text-[10px] text-blue-600 font-medium">Toggle this if you were accepted to present this abstract.</p>
                      </div>
                    </label>
                  </motion.div>
                )}

                {/* Institutional & Date Fields */}
                {['Publication', 'Presentation', 'Abstract', 'Public Speech'].includes(type) && (
                  <div className="space-y-4">
                    {(type !== 'Publication' && type !== 'Public Speech' && type !== 'Abstract' || ((type === 'Publication' || type === 'Abstract') && presentedAsPaper)) && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Conducted Institution <span className="text-red-500">*</span></label>
                        <input type="text" value={conductedInstitution} onChange={e => { setConductedInstitution(e.target.value); setFieldErrors(prev => ({...prev, conductedInstitution: null})); }} placeholder="e.g. Oxford University" className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm ${fieldErrors.conductedInstitution ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                        {fieldErrors.conductedInstitution && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.conductedInstitution}</p>}
                      </div>
                    )}
                    
                    {['Publication', 'Presentation', 'Abstract'].includes(type) ? (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Date of {type === 'Publication' ? 'Publication' : 'Program'} 
                          {type !== 'Abstract' && <span className="text-red-500"> *</span>}
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          <select 
                            value={pubMonth} 
                            onChange={e => { setPubMonth(e.target.value); setFieldErrors(prev => ({...prev, pubDate: null})); }}
                            className={`w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white transition shadow-sm ${fieldErrors.pubDate ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                          >
                            <option value="">Month*</option>
                            {MONTHS.filter((m, idx) => {
                              const isFuture = parseInt(pubYear) === new Date().getFullYear() && idx > new Date().getMonth();
                              return !isFuture;
                            }).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <select 
                            value={pubYear} 
                            onChange={e => { setPubYear(e.target.value); setFieldErrors(prev => ({...prev, pubDate: null})); }}
                            className={`w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white transition shadow-sm ${fieldErrors.pubDate ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                          >
                            <option value="">Year*</option>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <select 
                            value={pubDay} 
                            onChange={e => setPubDay(e.target.value)}
                            className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none bg-white transition shadow-sm text-gray-700"
                          >
                            <option value="">Day (Opt)</option>
                            {Array.from({ length: getDaysInMonth(pubMonth, pubYear) }, (_, i) => (i + 1).toString()).filter(d => {
                              const now = new Date();
                              const isFuture = parseInt(pubYear) === now.getFullYear() && MONTHS.indexOf(pubMonth) === now.getMonth() && parseInt(d) > now.getDate();
                              return !isFuture;
                            }).map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        {fieldErrors.pubDate && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.pubDate}</p>}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Date of Program <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          max={new Date().toISOString().split('T')[0]}
                          value={dateOfProgram} 
                          onChange={e => { setDateOfProgram(e.target.value); setFieldErrors(prev => ({...prev, dateOfProgram: null})); }} 
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm text-gray-700 ${fieldErrors.dateOfProgram ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                        />
                        {fieldErrors.dateOfProgram && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.dateOfProgram}</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* Web Dev Fields */}
                {type === 'Web Development' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Website Name <span className="text-red-500">*</span></label>
                      <input type="text" value={websiteName} onChange={e => { setWebsiteName(e.target.value); setFieldErrors(prev => ({...prev, websiteName: null})); }} placeholder="e.g. Portfolio Site" className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm ${fieldErrors.websiteName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                      {fieldErrors.websiteName && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.websiteName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Website URL <span className="text-red-500">*</span></label>
                      <input type="url" value={websiteURL} onChange={e => { setWebsiteURL(e.target.value); setFieldErrors(prev => ({...prev, websiteURL: null})); }} placeholder="https://" className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue shadow-sm ${fieldErrors.websiteURL ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                      {fieldErrors.websiteURL && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{fieldErrors.websiteURL}</p>}
                    </div>
                  </div>
                )}

                {/* Description & Photo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Description (Optional)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows="4" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none resize-none shadow-sm" placeholder="Add any extra notes..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Photo Evidence (Optional)</label>
                    <p className={`italic text-[10px] mb-2 leading-tight transition-colors ${photoError ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {photoError ? 'Image exceeds the size limit! (Max 300 KB)' : 'Maximum size 300 KB'}
                    </p>
                    <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition cursor-pointer group relative h-[120px] ${photoError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-brand-blue'}`}>
                      <input 
                        type="file" 
                        accept="image/jpeg, image/png, image/webp" 
                        onChange={e => {
                          const f = e.target.files[0];
                          if (f && f.size > 300 * 1024) {
                            setPhotoError(true);
                            setPhotoFile(null);
                            e.target.value = null;
                          } else {
                            setPhotoError(false);
                            setPhotoFile(f);
                          }
                        }} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      />
                      <Upload className={`w-8 h-8 mb-2 transition-colors ${photoError ? 'text-red-400' : 'text-gray-400 group-hover:text-brand-blue'}`} />
                      {photoFile ? (
                        <p className="text-sm font-medium text-brand-green truncate w-full text-center px-4">{photoFile.name}</p>
                      ) : existingPhotoURL ? (
                        <span className="text-sm text-brand-blue font-medium">Existing Photo Uploaded</span>
                      ) : (
                        <span className={`text-sm transition-colors ${photoError ? 'text-red-500' : 'text-gray-500 group-hover:text-brand-blue'}`}>
                          {photoError ? 'Please choose a smaller file' : 'Click to upload'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={handleNext} className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5">
                    Continue to Evaluation <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                
                {/* 1. Star Rating */}
                <div className={`border p-4 sm:p-8 rounded-2xl flex flex-col items-center shadow-sm transition-colors ${fieldErrors.stars ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-100'}`}>
                  <h3 className={`text-lg font-bold mb-4 tracking-wide uppercase ${fieldErrors.stars ? 'text-red-900' : 'text-orange-900'}`}>Award Stars</h3>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button" onClick={() => { setStars(s); setFieldErrors(prev => ({...prev, stars: null})); }} className="focus:outline-none transform hover:scale-110 transition-transform">
                        <Star className={`w-10 h-10 sm:w-12 sm:h-12 ${s <= stars ? 'fill-orange-400 text-orange-400 drop-shadow-md' : fieldErrors.stars ? 'text-red-200' : 'text-orange-200'}`} strokeWidth={1} />
                      </button>
                    ))}
                  </div>
                  {fieldErrors.stars && <p className="text-red-500 text-xs font-bold mt-4 animate-bounce">{fieldErrors.stars}</p>}
                </div>

                {/* 2. Grade Badge */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Overall Grade</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                    {GRADE_OPTIONS.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setGrade(g);
                          const points = GRADE_POINTS[g] || 5;
                          setMarks(points);
                        }}
                        className={`py-3 px-2 rounded-xl text-sm font-bold text-center border-2 transition-all ${grade === g ? 'border-brand-blue bg-brand-blue text-white shadow-md shadow-brand-blue/20' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Slider Marks */}
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <label className="block text-sm font-bold text-gray-700">Evaluation Marks</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.5"
                        value={marks} 
                        onChange={e => setMarks(parseFloat(e.target.value) || 0)} 
                        className="text-3xl font-black text-brand-blue font-mono bg-gray-50 border border-gray-200 rounded-xl w-32 text-center py-2 outline-none focus:border-brand-blue"
                      />
                      <span className="text-lg text-gray-400 font-sans mt-2">Pts</span>
                    </div>
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={marks > 10 ? 10 : marks}
                    onChange={e => setMarks(parseFloat(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-brand-blue"
                  />
                  
                  <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 px-1">
                    <span>0</span>
                    <span>5</span>
                    <span>10+</span>
                  </div>
                </div>

                {/* 4. Special Options */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Special Options</label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition">
                      <input 
                        type="checkbox" 
                        checked={isOutreach} 
                        onChange={(e) => setIsOutreach(e.target.checked)} 
                        className="w-5 h-5 text-brand-blue rounded focus:ring-brand-blue"
                      />
                      <span className="font-semibold text-gray-700">Outreach Activities</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition">
                      <input 
                        type="checkbox" 
                        checked={isMission100} 
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsMission100(checked);
                          if (checked) setIsOutreach(true);
                        }} 
                        className="w-5 h-5 text-brand-blue rounded focus:ring-brand-blue"
                      />
                      <span className="font-semibold text-gray-700">Mission 100</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-100">
                  <button onClick={() => setStep(1)} type="button" className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-bold" disabled={internalLoading || uploading}>
                    Back
                  </button>
                  <button onClick={handleSubmit} disabled={internalLoading || uploading} className={`flex items-center px-8 py-3 ${isEditing ? 'bg-brand-blue' : 'bg-brand-green'} text-white rounded-xl hover:opacity-90 transition font-bold shadow-md hover:shadow-lg disabled:opacity-50`}>
                    {(internalLoading || uploading) ? <RefreshCcw className="w-5 h-5 mr-2 animate-spin" /> : isEditing ? <Pencil className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                    {(internalLoading || uploading) ? 'Saving securely...' : isEditing ? 'Update Achievement' : 'Save & Publish Achievement'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AddAchievementModal;
