"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Calendar } from "../components/ui/calendar"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Upload, File as FileIcon, X, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover"
import { cn } from "../lib/utilis"
import { Label } from "../components/ui/label"
import { toast } from "sonner"
import { AddExamCardProps } from "../lib/types"
import { useSession } from "next-auth/react"



// Helper component for required field label
const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <div>
    {children} <span className="text-red-500">*</span>
  </div>
);

export function AddExamCard({ onSave, onCancel }: AddExamCardProps) {
  const { data: session } = useSession();
  const [subjectName, setSubjectName] = useState("")
  const [description, setDescription] = useState("")
  const [examDate, setExamDate] = useState<Date>()
  const [syllabus, setSyllabus] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle file drop
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    handleFiles(files)
  }, [])

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  // Process the files
  const handleFiles = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0]
      // Check if file is jpg or png
      if (file.type === "image/jpeg" || file.type === "image/png") {
        setSyllabus(file)
        
        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        toast.error("Please upload a JPG or PNG file", {
          style: { backgroundColor: "#f44336", color: "white" }
        })
      }
    }
  }

  // Remove file
  const handleRemoveFile = () => {
    setSyllabus(null)
    setFilePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent default form validation and handle manually
    let isValid = true;
    
    if (!subjectName.trim()) {
      toast.error("Please enter subject name", {
        style: { backgroundColor: "#f44336", color: "white" }
      });
      isValid = false;
    }
    
    if (!examDate) {
      toast.error("Please select an exam date", {
        style: { backgroundColor: "#f44336", color: "white" }
      });
      isValid = false;
    }
    
    if (!syllabus) {
      toast.error("Please upload a syllabus", {
        style: { backgroundColor: "#f44336", color: "white" }
      });
      isValid = false;
    }
    
    if (!isValid || isSubmitting) return;
    
    try {
      // Set submitting state to true to disable the button
      setIsSubmitting(true);
      
      // Show loading toast immediately and store the reference
      const loadingToast = toast.loading("Creating your exam and processing syllabus...");
      
      // Create FormData to send the file directly
      const formData = new FormData();
      formData.append('userId', (session?.user as any)?.id || "");
      formData.append('subjectName', subjectName.trim());
      formData.append('description', description.trim());
      formData.append('examDate', examDate ? examDate.toISOString() : '');
      if (syllabus) {
        formData.append('syllabusFile', syllabus); // Send the actual file
      }
    
      // API CALL with syllabus validation
      const response = await fetch('/api/exams/create-with-syllabus', {
        method: 'POST',
        body: formData, // Send FormData instead of JSON
      });
      
      const result = await response.json();
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if (!response.ok) {
        // Check if it's a syllabus validation error
        if (result.isSyllabus === false) {
          toast.error("This doesn't appear to be a syllabus! Please upload a valid syllabus document with chapters and topics.", {
            style: { backgroundColor: "#f44336", color: "white" },
            duration: 5000
          });
          
          // Reset the file upload to allow user to upload a new file
          handleRemoveFile();
          
          return; // Don't proceed further
        }
        
        // Handle other errors
        throw new Error(result.error || 'Failed to create exam');
      }
      
      // Success case
      toast.success("Exam created and syllabus processed successfully!", {
        style: { backgroundColor: "#4caf50", color: "white" }
      });
      
      // Pass the saved exam data back to the parent component
      onSave(result.exam);
      
      // Close the modal
      onCancel();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create exam", {
        style: { backgroundColor: "#f44336", color: "white" }
      });
      console.error("Error creating exam:", error);
    } finally {
      // Reset submitting state
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg bg-white dark:bg-black/90 border-2 border-gray-100 dark:border-white/10 rounded-2xl">
      <CardHeader>
        <CardTitle>Add New Exam</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel>
              <Label htmlFor="exam-title">Subject Name</Label>
            </RequiredLabel>
            <Input 
              id="subject-name" 
              placeholder="Enter subject name" 
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
              className="border border-gray-200 dark:border-white/20"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="exam-description">Description</Label>
            <Textarea 
              id="exam-description" 
              placeholder="Enter exam description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-25 border border-gray-200 dark:border-white/20"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <RequiredLabel>
              <Label>Exam Date</Label>
            </RequiredLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal border border-gray-200 dark:border-white/20",
                    !examDate && "text-muted-foreground"
                  )}
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {examDate ? format(examDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={examDate}
                  onSelect={setExamDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Syllabus Upload Section */}
          <div className="space-y-2">
            <RequiredLabel>
              <Label htmlFor="syllabus-upload">Syllabus (JPG/PNG)</Label>
            </RequiredLabel>
            {!syllabus ? (
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isDragging 
                    ? "border-black bg-gray-50 dark:border-white dark:bg-black/70" 
                    : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
                onDragOver={!isSubmitting ? handleDragOver : undefined}
                onDragLeave={!isSubmitting ? handleDragLeave : undefined}
                onDrop={!isSubmitting ? handleDrop : undefined}
                onClick={() => !isSubmitting && document.getElementById('file-upload')?.click()}
              >
                <div className="flex flex-col items-center justify-center">
                  <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Drag and drop your syllabus image here
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    or click to browse (JPG, PNG)
                  </p>
                </div>
                <input 
                  id="file-upload" 
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png"
                  onChange={handleFileInput}
                  disabled={isSubmitting}
                />
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                  {filePreview ? (
                    <div className="relative w-12 h-12 mr-4 overflow-hidden rounded">
                      <img 
                        src={filePreview} 
                        alt="Syllabus preview" 
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <FileIcon className="w-12 h-12 mr-4 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{syllabus.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(syllabus.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleRemoveFile}
                    type="button"
                    disabled={isSubmitting}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            type="button" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="border border-gray-200 dark:border-white/20"
          >
            Cancel
          </Button>
          
          <Button 
            type="submit"
            disabled={isSubmitting}
            className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Save Exam'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}