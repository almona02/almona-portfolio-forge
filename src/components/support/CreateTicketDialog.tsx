import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TicketForm from './TicketForm';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated: () => void;
}

const CreateTicketDialog: React.FC<CreateTicketDialogProps> = ({ open, onOpenChange, onTicketCreated }) => {
  const handleClose = (o: boolean) => {
    if (!o) onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>Describe your issue and we'll help you resolve it quickly.</DialogDescription>
        </DialogHeader>
        <TicketForm mode="dialog" showAttachments={false} showContactFields onSuccess={onTicketCreated} />
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
};

export { CreateTicketDialog };
export default CreateTicketDialog;
