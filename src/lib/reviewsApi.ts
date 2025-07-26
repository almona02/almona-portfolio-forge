
interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  date: string;
  productId: string;
}

let mockReviews: Review[] = [
  {
    id: '1',
    productId: 'dc-421-pbs',
    rating: 5,
    comment: 'Excellent machine, very precise and easy to use.',
    reviewerName: 'Ahmed M.',
    date: '2023-01-15',
  },
  {
    id: '2',
    productId: 'dk-502',
    rating: 4,
    comment: 'Good value for money, reliable performance.',
    reviewerName: 'Fatima S.',
    date: '2023-03-20',
  },
];

export const getReviewsByProductId = async (productId: string): Promise<Review[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockReviews.filter(review => review.productId === productId));
    }, 300);
  });
};

export const addReview = async (review: Omit<Review, 'id' | 'date'>): Promise<Review> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newReview: Review = {
        ...review,
        id: String(mockReviews.length + 1),
        date: new Date().toISOString().split('T')[0],
      };
      mockReviews.push(newReview);
      resolve(newReview);
    }, 300);
  });
};
