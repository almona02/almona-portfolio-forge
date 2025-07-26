import { useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/ui/dialog';
import { Badge } from '@/shared/ui/ui/badge';
import { motion } from 'framer-motion';

const trainingModules = [
  { id: 'safety', title: 'Safety Protocols', duration: '2 hours', level: 'Beginner' },
  { id: 'operation', title: 'Basic Machine Operation', duration: '4 hours', level: 'Beginner' },
  { id: 'maintenance', title: 'Routine Maintenance', duration: '3 hours', level: 'Intermediate' },
  { id: 'troubleshooting', title: 'Advanced Troubleshooting', duration: '5 hours', level: 'Advanced' },
  { id: 'calibration', title: 'Precision Calibration', duration: '4 hours', level: 'Advanced' },
];

export const EnhancedOperatorTrainingDialog = ({ open, onOpenChange }) => {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const toggleModule = (id: string) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(moduleId => moduleId !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-almona-darker text-white border-almona-light/20">
        <DialogHeader>
          <DialogTitle className="text-2xl">Enhanced Operator Training</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trainingModules.map(module => (
            <motion.div
              key={module.id}
              onClick={() => toggleModule(module.id)}
              className={`p-4 border rounded-lg cursor-pointer ${selectedModules.includes(module.id) ? 'border-orange-500' : 'border-almona-light/20'}`}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{module.title}</h3>
                <Badge>{module.level}</Badge>
              </div>
              <p className="text-sm text-gray-400">Duration: {module.duration}</p>
            </motion.div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-orange-500">Enroll ({selectedModules.length})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
