import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';

const AchievementPosterModal = ({ achievement, student, onClose }) => {
  if (!achievement || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 poster-modal-overlay">

        {/* Controls - Hidden during print */}
        <div className="absolute top-4 right-4 flex items-center gap-3 z-[110] hide-on-print">
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-[#1e3a8a] text-white rounded-lg shadow-lg hover:bg-blue-900 transition-colors font-medium"
          >
            <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white text-gray-500 hover:text-gray-900 rounded-full shadow-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Poster Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-[794px] max-h-full overflow-y-auto overflow-x-hidden hide-scrollbar rounded-xl shadow-2xl print:shadow-none print:rounded-none print:overflow-visible print:max-h-none print:w-auto"
        >
          {/* The A4 Canvas */}
          <div
            id="poster-print-area"
            className="bg-white w-full aspect-[1/1.414] mx-auto relative flex flex-col p-6 sm:p-10 print:p-[12mm] border border-gray-200"
          >
            {/* Inner elegant borders */}
            <div className="absolute inset-4 sm:inset-6 print:inset-[8mm] border-2 border-amber-200/60 pointer-events-none z-0 rounded-sm"></div>
            <div className="absolute inset-5 sm:inset-7 print:inset-[10mm] border border-amber-300/40 pointer-events-none z-0 rounded-sm"></div>

            {/* Background subtle accents */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute top-[-15%] right-[-15%] w-[50%] h-[50%] bg-amber-50/80 rounded-full mix-blend-multiply blur-3xl opacity-70"></div>
              <div className="absolute bottom-[-15%] left-[-15%] w-[60%] h-[60%] bg-blue-50/80 rounded-full mix-blend-multiply blur-3xl opacity-70"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-between h-full py-4 print:py-8">

              {/* Top Section */}
              <div className="flex flex-col items-center w-full">
                {/* Photo */}
                <div className="relative mb-8 sm:mb-10 mt-2 sm:mt-6 print:mt-10">
                  <div className="absolute inset-[-12px] border border-amber-300/60 rounded-full"></div>
                  <div className="absolute inset-[-6px] border-2 border-amber-400/40 rounded-full"></div>
                  <div className="w-32 h-32 sm:w-44 sm:h-44 print:w-48 print:h-48 rounded-full overflow-hidden border-[4px] sm:border-[6px] border-white shadow-xl bg-gray-50 relative z-10">
                    {student.photoURL ? (
                      <img src={student.photoURL} alt={student.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-50 flex items-center justify-center text-[#1e3a8a] text-5xl sm:text-6xl font-serif">
                        {student.fullName?.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Congratulations Header */}
                <div className="flex items-center gap-3 sm:gap-6 mb-4 sm:mb-6 w-full justify-center">
                  <div className="h-[1px] bg-gradient-to-r from-transparent to-amber-300 flex-1 max-w-[60px] sm:max-w-[80px]"></div>
                  <h1 className="text-4xl sm:text-6xl print:text-7xl font-serif italic font-bold text-amber-500 drop-shadow-sm leading-none text-center tracking-wide">
                    Congratulations
                  </h1>
                  <div className="h-[1px] bg-gradient-to-l from-transparent to-amber-300 flex-1 max-w-[60px] sm:max-w-[80px]"></div>
                </div>

                {/* Student Name */}
                <h2 className="text-2xl sm:text-4xl print:text-5xl font-bold text-gray-900 tracking-tight text-center mb-3 sm:mb-4">
                  {student.fullName}
                </h2>

                {/* Class */}
                <div className="px-4 sm:px-6 py-1.5 bg-gray-50 border border-gray-100 rounded-full shadow-sm">
                  <p className="text-gray-500 font-bold tracking-[0.2em] uppercase text-[10px] sm:text-xs print:text-sm text-center">
                    Class: {student.className}
                  </p>
                </div>
              </div>

              {/* Middle Section: Achievement */}
              <div className="flex flex-col items-center text-center max-w-[90%] sm:max-w-[85%] print:max-w-[80%] my-auto py-6 sm:py-8">
                <div className="mb-4 sm:mb-8 flex flex-col items-center">
                  <span className="text-[10px] sm:text-xs print:text-sm font-bold tracking-[0.25em] text-amber-600/80 uppercase mb-2 sm:mb-3">
                    Recognized For
                  </span>
                  <h3 className="text-xl sm:text-3xl print:text-4xl font-bold text-[#1e3a8a] leading-snug capitalize">
                    {achievement.title}
                  </h3>
                </div>

                <div className="relative w-full max-w-2xl mt-2 sm:mt-4">
                  <span className="absolute -top-4 sm:-top-8 -left-2 sm:-left-6 text-4xl sm:text-6xl text-amber-200/60 font-serif leading-none select-none">"</span>
                  <p className="text-gray-700 text-base sm:text-xl print:text-2xl leading-relaxed font-medium relative z-10 px-4 sm:px-8 italic text-center">
                    {achievement.note}
                  </p>
                  <span className="absolute -bottom-4 sm:-bottom-8 -right-2 sm:-right-6 text-4xl sm:text-6xl text-amber-200/60 font-serif leading-none select-none">"</span>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="flex flex-col items-center w-full mt-auto">
                <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-4 sm:mb-6"></div>

                {achievement.date && (
                  <p className="text-gray-400 font-bold tracking-widest uppercase text-[11px]">
                    Awarded on <span className="text-gray-600">{new Date(achievement.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </p>
                )}
              </div>

              {/* Bottom Logo Section */}
              <div className="w-full flex flex-col items-center mt-12 mb-4">
                <img
                  src="/logo.png"
                  alt="Daru Rahma Arabic College"
                  className="w-28 h-auto object-contain drop-shadow-md"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="hidden text-blue-900 font-black tracking-widest uppercase text-[11px] mt-5 opacity-80 text-center leading-relaxed">
                  Daru Rahma Arabic College<br />
                  <span className="text-gray-500 font-medium text-[9px]">Excellence In Education</span>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Global Print Styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { size: A4 portrait; margin: 0; }
            body * { visibility: hidden !important; }
            #poster-print-area, #poster-print-area * { visibility: visible !important; }
            #poster-print-area { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 210mm; 
              height: 297mm; 
              margin: 0; 
              padding: 0;
              background-color: #faf9f6 !important; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
              box-shadow: none !important;
            }
            .hide-on-print { display: none !important; }
            .poster-modal-overlay { background: none !important; backdrop-filter: none !important; }
          }
        `}} />
      </div>
    </AnimatePresence>
  );
};

export default AchievementPosterModal;

