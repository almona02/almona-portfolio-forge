import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { alfapenProfiles, Profile } from "../../constants/productsData";
import { ReviewForm } from "@/components/shop/ReviewForm";
import { ReviewList } from "@/components/shop/ReviewList";
import { getReviewsByProductId, addReview } from "@/lib/reviewsApi";
import { useTranslation } from "react-i18next";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { toast } from "sonner";

const ProfileDetail: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const [reviews, setReviews] = useState<any[]>([]);
  const { t } = useTranslation('shop');
  const { addRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    if (profileId) {
      getReviewsByProductId(profileId).then(setReviews);
      addRecentlyViewed(profileId);
    }
  }, [profileId, addRecentlyViewed]);

  const handleAddReview = async (rating: number, comment: string, reviewerName: string) => {
    if (!profileId) return;
    const newReview = await addReview({ productId: profileId, rating, comment, reviewerName });
    setReviews(prev => [...prev, newReview]);
    toast.success(t('reviews.review_submitted_success'));
  };

  const profile: Profile | undefined = alfapenProfiles.find(
    (p) => p.id === profileId
  );

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-4">Profile Not Found</h1>
        <p className="mb-4">The profile you are looking for does not exist.</p>
        <Link to="/products/profiles" className="text-blue-600 underline">
          Back to Profiles
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">{profile.name}</h1>
      <img
        src={profile.imageUrl}
        alt={profile.name}
        className="w-full max-h-96 object-contain mb-6 rounded"
        loading="lazy"
      />
      <p className="mb-4">{profile.description}</p>
      <div className="mb-4">
        <strong>Material:</strong> {profile.material}
      </div>
      <div className="mb-4">
        <strong>Color:</strong> {profile.color}
      </div>
      <div className="mb-4">
        <strong>Applications:</strong>
        <ul className="list-disc list-inside">
          {profile.applications.map((app, index) => (
            <li key={index}>{app}</li>
          ))}
        </ul>
      </div>
      <Link to="/products/profiles" className="text-blue-600 underline">
        Back to Profiles
      </Link>

      <div className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-gradient-orange">{t('reviews.section_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ReviewForm productId={profile.id} onSubmit={handleAddReview} />
          <ReviewList reviews={reviews} />
        </div>
      </div>
    </div>
  );
};

export default ProfileDetail;
