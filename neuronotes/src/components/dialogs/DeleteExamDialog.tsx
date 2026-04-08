import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react'; // Add this import

// Random words for confirmation
const CONFIRMATION_WORDS = [
  'delete', 'confirm', 'remove', 'erase', 'dispose',
  'purge', 'eliminate', 'destroy', 'discard', 'cancel'
];

interface DeleteExamDialogProps {
  examId: string;
  examName: string;
  triggerClassName?: string;
}

export function DeleteExamDialog({ examId, examName, triggerClassName }: DeleteExamDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationWord, setConfirmationWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const router = useRouter();
  const { data: session } = useSession(); // Get user session

  // Generate a random confirmation word when dialog opens
  useEffect(() => {
    if (open) {
      const randomIndex = Math.floor(Math.random() * CONFIRMATION_WORDS.length);
      setConfirmationWord(CONFIRMATION_WORDS[randomIndex]);
      setUserInput('');
    }
  }, [open]);

  const handleDelete = async () => {
    if (userInput.toLowerCase() !== confirmationWord.toLowerCase()) {
      toast.error('The confirmation word does not match.');
      return;
    }

    if (!session?.user || !(session.user as { id?: string }).id) {
      toast.error('You must be logged in to delete an exam');
      return;
    }

    try {
      setIsDeleting(true);
      await axios.delete(`/api/exams/${examId}`, {
        data: { userId: (session.user as { id?: string })?.id } // Send userId with the DELETE request
      });
      
      toast.success('Exam deleted successfully');
      setOpen(false);
      // Redirect to homepage
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error deleting exam:', error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error('You do not have permission to delete this exam');
      } else {
        toast.error('Failed to delete exam. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={triggerClassName || "flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl"}>
          <Trash2 className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-red-500 transition-colors duration-200" />
          <span className="text-gray-700 dark:text-gray-300 group-hover:text-red-500 transition-colors duration-200">Delete</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-lg">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-semibold text-gray-800 dark:text-white">Delete Exam</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 text-base mt-2">
            This action cannot be undone. This will permanently delete <span className="font-medium text-gray-800 dark:text-white">{examName}</span> and all its associated data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 border border-red-200 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-black dark:border-red-900/60 rounded-lg my-2">
          <p className="text-sm text-center text-gray-700 dark:text-gray-300">
            Type <span className="font-bold text-red-600 dark:text-red-500">{confirmationWord}</span> to confirm
          </p>
        </div>
        
        <Input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={`Type "${confirmationWord}" here`}
          className="mt-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:ring-1 focus:ring-red-300 dark:focus:ring-red-700"
        />
        
        <DialogFooter className="mt-6 flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="flex-1 py-2 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting || userInput.toLowerCase() !== confirmationWord.toLowerCase()}
            className="flex-1 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 dark:from-red-700 dark:to-red-800 dark:hover:from-red-800 dark:hover:to-red-900 text-white disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Exam'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
