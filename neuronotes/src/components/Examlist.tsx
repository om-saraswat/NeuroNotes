import React from 'react';
import ExamCard from './ExamCard';
import {ExamsListProps} from '../lib/types'; // Adjust the import path as necessary

// Import Shadcn Carousel components
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const ExamsList: React.FC<ExamsListProps> = ({ title, exams, type, onAddExam }) => {
  return (
    <section className="mb-16">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      
      {exams && exams.length > 0 ? (
        <div className="relative">
          <Carousel 
            opts={{
              align: "start",
              loop: exams.length > 3,
            }}
            className="w-full"
          >
            <CarouselContent>
              {exams.map((exam) => (
                <CarouselItem key={exam._id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <ExamCard exam={exam} type={type} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="hidden md:block">
              <CarouselPrevious className="absolute -left-12 top-1/2 transform -translate-y-1/2" />
              <CarouselNext className="absolute -right-12 top-1/2 transform -translate-y-1/2" />
            </div>
          </Carousel>
          
          {/* Fallback to grid for mobile view with horizontal scrolling */}
          <div className="mt-4 flex justify-center gap-1 md:hidden">
            {Array.from({ length: Math.ceil(exams.length / 3) }).map((_, index) => (
              <div 
                key={`indicator-${index}`}
                className={`h-1.5 w-1.5 rounded-full ${index === 0 ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-black/90 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-black/70 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {type === 'current' 
                  ? <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/> 
                  : <path d="M5 13l4 4L19 7"/>}
              </svg>
            </div>
          </div>
          <p className="text-gray-700 dark:text-white/80 font-bold text-lg mb-2">
            {type === 'current' ? 'No current exams' : 'No completed exams yet'}
          </p>
          <p className="text-gray-500 dark:text-white/60 mb-6">
            {type === 'current' 
              ? 'Start by adding exam to get organized' 
              : 'Complete your first exam to see results here'}
          </p>
          {type === 'current' && onAddExam && (
            <button 
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium"
              onClick={onAddExam}
            >
              Add Exam
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default ExamsList;
