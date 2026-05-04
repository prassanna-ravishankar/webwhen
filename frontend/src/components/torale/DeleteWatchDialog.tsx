import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteWatchDialogProps {
  taskName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  extraDescription?: string;
}

export const DeleteWatchDialog: React.FC<DeleteWatchDialogProps> = ({
  taskName,
  open,
  onOpenChange,
  onConfirm,
  extraDescription,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="border border-ink-6 shadow-ww-md">
      <AlertDialogHeader className="border-b border-ink-6 pb-4">
        <AlertDialogTitle className="">Delete watch?</AlertDialogTitle>
        <AlertDialogDescription className="text-ink-3">
          Are you sure you want to delete "{taskName}"? This action cannot be undone.{extraDescription ? ` ${extraDescription}` : ''}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="gap-3">
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="shadow-ww-sm">
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
