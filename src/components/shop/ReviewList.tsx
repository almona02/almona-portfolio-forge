
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  date: string;
}

interface ReviewListProps {
  reviews: Review[];
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  const { t } = useTranslation('shop');

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-almona-darker border-almona-light">
      <h3 className="text-xl font-semibold text-gradient-orange">{t('reviews.customer_reviews')} ({reviews.length})</h3>
      {reviews.length === 0 ? (
        <p className="text-gray-400">{t('reviews.no_reviews')}</p>
      ) : (
        reviews.map((review) => (
          <div key={review.id} className="pb-4 border-b border-almona-light last:border-b-0">
            <div className="flex items-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`${star <= review.rating ? 'text-yellow-400' : 'text-gray-500'}`}
                  size={18}
                  fill="currentColor"
                />
              ))}
              <span className="ml-2 text-gray-300 font-medium">{review.reviewerName}</span>
              <span className="ml-auto text-sm text-gray-500">{review.date}</span>
            </div>
            <p className="text-gray-300">{review.comment}</p>
          </div>
        ))
      )}
    </div>
  );
};
