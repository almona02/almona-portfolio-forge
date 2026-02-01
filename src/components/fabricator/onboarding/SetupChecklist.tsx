/**
 * Setup Checklist Widget
 * Shows onboarding progress and guides users through initial setup
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SetupChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  link?: string;
}

interface SetupChecklistProps {
  userId: string;
}

export const SetupChecklist: React.FC<SetupChecklistProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<SetupChecklistItem[]>([
    { id: 'customer', label: 'Create first customer', completed: false },
    { id: 'profile', label: 'Import profiles', completed: false },
    { id: 'optimization', label: 'Run your first optimization', completed: false },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProgress = async () => {
      if (!userId) return;

      try {
        // Check if customer exists
        const { data: customers } = await supabase
          .from('fabricator_customers')
          .select('id')
          .eq('owner_user_id', userId)
          .limit(1);

        // Check if profiles exist
        const { data: profiles } = await supabase
          .from('fabricator_profiles')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        // Check if optimization has been run (check for positions with optimization)
        const { data: positions } = await supabase
          .from('fabricator_positions')
          .select('id')
          .eq('owner_user_id', userId)
          .not('optimization', 'is', null)
          .limit(1);

        setItems([
          {
            id: 'customer',
            label: 'Create first customer',
            completed: (customers?.length || 0) > 0,
            link: '/fabricator/customers',
          },
          {
            id: 'profile',
            label: 'Import profiles',
            completed: (profiles?.length || 0) > 0,
            link: '/fabricator/inventory',
          },
          {
            id: 'optimization',
            label: 'Run your first optimization',
            completed: (positions?.length || 0) > 0,
            link: '/fabricator-workflow',
          },
        ]);
      } catch (error) {
        console.error('Failed to check setup progress:', error);
      } finally {
        setLoading(false);
      }
    };

    void checkProgress();
  }, [userId]);

  const completedCount = items.filter((item) => item.completed).length;
  const progressPercentage = (completedCount / items.length) * 100;

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="text-sm text-gray-400">Loading setup progress...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg">Setup Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Overall Progress</span>
            <span className="font-medium text-amber-400">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-900/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-500" />
                )}
                <span
                  className={`text-sm ${
                    item.completed ? 'text-gray-300 line-through' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {!item.completed && item.link && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.link!)}
                  className="text-xs"
                >
                  Go
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {completedCount === items.length && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400 font-medium">
              🎉 Setup complete! You're ready to start using Fabricator Pro.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

