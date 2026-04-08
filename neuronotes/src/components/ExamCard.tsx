import React from 'react';
import {ExamCardProps} from '../lib/types'; // Adjust the import path as necessary
import { useRouter } from 'next/navigation'; // Import router for navigation


const ExamCard: React.FC<ExamCardProps> = ({ exam, type }) => {
  const isCompleted = type === 'completed';
  const router = useRouter(); // Initialize router
  
  // Handler for card click
  const handleCardClick = () => {
    console.log(`Navigating to exam with ID: ${exam._id}`);
    router.push(`/exams/${exam._id}`);
  };
  
  return (
    <div 
      className="bg-white dark:bg-black/90 border-2 border-gray-100 dark:border-white/10 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-white/30 hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={handleCardClick} // Add onClick handler
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-xl mb-2 group-hover:text-gray-700 dark:group-hover:text-white/80 transition-colors">{exam.subjectName}</h3>
          <p className="text-gray-500 dark:text-white/60">
            {isCompleted 
              ? `Completed on ${new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : (new Date(exam.examDate) > new Date() 
                 ? `Due ${new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
                 : `Overdue since ${new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                )
            }
          </p>
        </div>
        {/* {isCompleted ? (
          <div className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold text-lg">
            {exam.score}
          </div>
        ) : (
          <div className="h-12 w-12 bg-gray-50 dark:bg-black/70 rounded-full flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        )} */}
      </div>
      
        <span className="text-sm font-bold ">
          {isCompleted ? 
            'Completed'
          : 'In Progress'}
        </span>
      
    </div>
  );
};

export default ExamCard;