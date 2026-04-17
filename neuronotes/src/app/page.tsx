"use client"
import React, { useState, useEffect } from 'react'
import { AddExamCard } from '../components/AddExamCard'
import ExamsList from '../components/Examlist'
import axios from 'axios'
import { ExamData } from '../lib/types' // Adjust the import path as necessary
import { Footer } from '../components/Footer';

const Page = () => {
  const [showAddExamCard, setShowAddExamCard] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const [error, setError] = useState<string | null>(null); // Add error state for better UX

  // Sample data - would come from your actual data source
  const [currentExams, setCurrentExams] = useState<ExamData[]>([]);
  const [completedExams, setCompletedExams] = useState<ExamData[]>([]);

  // Here you would fetch data from your API
  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true); // Set loading to true before fetching data
        const currentDate = new Date();
        // Fetching exams from the API using Get request with axios
        const response = await axios.get('/api/exams'); 
        console.log('Fetched exams:', response.data);
        const completedExamsList = [];
        const currentExamsList = [];
        // Data would contain the list of all exams it can be previous or upcoming
        // Obtaining current and completed exams from the data

        for(const exam of response.data) {
          // Convert the examDate string to a Date object for proper comparison
          const examDate = new Date(exam.examDate);
          
          // Compare the dates correctly
          if(examDate <= currentDate) {
            completedExamsList.push({
              _id : exam._id,
              userId: exam.userId,
              subjectName: exam.subjectName,
              description: exam.description,
              createdAt: new Date(exam.createdAt),
              examDate: new Date(exam.examDate)
            });
          } else {
            currentExamsList.push({
              _id : exam._id, 
              userId: exam.userId,
              subjectName: exam.subjectName,
              description: exam.description,
              createdAt: new Date(exam.createdAt),
              examDate: new Date(exam.examDate)
            });
          }
        }
        setCurrentExams(currentExamsList);
        setCompletedExams(completedExamsList);
        setError(null);
      } catch (error) {
        console.error('Error fetching exams:', error);
        setError('Failed to load exams. Please try again later.');
      } finally {
        setLoading(false); // Set loading to false after data is fetched
      }
    };
    
    fetchExams();
  }, []);

  const handleAddExam = () => {
    setShowAddExamCard(true);
    document.body.style.overflow = 'hidden';
  };

  const handleSaveExam = async (savedExam: any) => {
    try {
      // Format the received exam to match your ExamData type
      const newExam: ExamData = {
        _id: savedExam._id,
        userId: savedExam.userId,
        subjectName: savedExam.subjectName,
        description: savedExam.description,
        createdAt: new Date(savedExam.createdAt),
        examDate: new Date(savedExam.examDate)
      };
      
      // Update the current exams state with the newly added exam
      setCurrentExams(prevExams => [...prevExams, newExam]);
      
      // Close modal - this is handled in AddExamCard now
      // setShowAddExamCard(false);
      // document.body.style.overflow = 'auto';
    } catch (error) {
      console.error('Error handling saved exam:', error);
    }
  };

  const handleCancelAddExam = () => {
    setShowAddExamCard(false);
    document.body.style.overflow = 'auto';
  };
  
  // Loading state - similar to the exam details page
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white to-gray-50 dark:from-black dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white to-gray-50 dark:from-black dark:to-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      
      <div className="container max-w-6xl mx-auto px-6 py-12">
        {/* Dashboard header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-16 gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 dark:text-white/70 text-lg">Organize and keep track of all your upcoming and completed exams in one place.</p>
          </div>
          
          <div className="flex items-center self-start md:self-auto">
            <button 
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200 flex items-center gap-3 shadow-sm font-medium"
              onClick={handleAddExam}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14m-7-7h14"/>
              </svg>
              Add New Exam
            </button>
          </div>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Stats cards content - unchanged */}
          <div className="bg-gray-50 dark:bg-black/90 shadow-lg shadow-gray-500 rounded-2xl p-8 border border-gray-100  dark:border-white/10  transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-600 dark:text-white/70 uppercase text-sm tracking-wide">Current Exams</h3>
              <span className="bg-white dark:bg-black/70 text-black dark:text-white text-sm px-3 py-1 rounded-full font-bold shadow-sm">{currentExams.length}</span>
            </div>
            <p className="text-3xl font-bold mb-4">{currentExams.length} Upcoming</p>
            <div className="h-2 w-full bg-gray-200 dark:bg-black/50 rounded-full overflow-hidden">
              <div className="bg-black dark:bg-white h-2 rounded-full transition-all duration-500" style={{ width: '60%' }}></div>
            </div>
          </div>
          
          {/* Other stats cards... */}
        </div>
        
        {/* Current Exams Section - Now using the component */}
        <ExamsList 
          title="Current Exams" 
          exams={currentExams}
          type="current" 
          onAddExam={handleAddExam} 
        />
        
        {/* Completed Exams Section - Now using the component */}
        <ExamsList 
          title="Completed Exams" 
          exams={completedExams}
          type="completed" 
        />
      </div>

      {/* Modal Overlay for Add Exam Card */}
      {showAddExamCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            className="w-full max-w-md animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <AddExamCard onSave={handleSaveExam} onCancel={handleCancelAddExam} />
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}

export default Page