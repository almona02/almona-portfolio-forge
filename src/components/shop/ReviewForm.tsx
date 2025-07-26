
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Label } from '@/shared/ui/ui/label';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewFormProps {
  productId: string;
  onSubmit: (rating: number, comment: string, reviewerName: string) => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  productId,
  onSubmit,
}) => {
  const { t } = useTranslation('shop');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }
    if (!reviewerName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    onSubmit(rating, comment, reviewerName);
    setRating(0);
    setComment('');
    setReviewerName('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-almona-darker border-almona-light">
      <h3 className="text-xl font-semibold text-gradient-orange">{t('reviews.write_review')}</h3>
      <div>
        <Label htmlFor="reviewerName">{t('reviews.your_name')}</Label>
        <Input
          id="reviewerName"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className="bg-almona-dark border-almona-light"
          required
        />
      </div>
      <div>
        <Label>{t('reviews.your_rating')}</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`cursor-pointer ${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-500'}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              size={24}
            />
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="comment">{t('reviews.your_comment')}</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="bg-almona-dark border-almona-light"
          rows={4}
          placeholder={t('reviews.comment_placeholder')}
        />
      </div>
      <Button type="submit" className="w-full bg-gradient-orange">
        {t('reviews.submit_review')}
      </Button>
    </form>
  );
};
