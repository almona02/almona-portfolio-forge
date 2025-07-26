import React, { useState, useEffect } from "react";
import { ReviewForm } from "@/components/shop/ReviewForm";
import { ReviewList } from "@/components/shop/ReviewList";
import { getReviewsByProductId, addReview } from "@/lib/reviewsApi";
import { useTranslation } from "react-i18next";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useParams, Link } from "react-router-dom";
import { yilmazMachines, Machine } from "@/constants/productsData";
import { Button } from "@/shared/ui/ui/button";
import { Download, Eye } from "lucide-react";
import { Model3DDialog } from "@/components/3d-model/Model3DDialog";

const MachineDetail: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const [show3DModel, setShow3DModel] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]); // State to hold reviews
  const { t } = useTranslation('shop');
  const { addRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    if (machineId) {
      getReviewsByProductId(machineId).then(setReviews);
      addRecentlyViewed(machineId);
    }
  }, [machineId, addRecentlyViewed]);

  const handleAddReview = async (rating: number, comment: string, reviewerName: string) => {
    if (!machineId) return;
    const newReview = await addReview({ productId: machineId, rating, comment, reviewerName });
    setReviews(prev => [...prev, newReview]);
    toast.success(t('reviews.review_submitted_success'));
  };

  const machine: Machine | undefined = yilmazMachines.find(
    (m) => m.id === machineId
  );

  if (!machine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-4">Machine Not Found</h1>
        <p className="mb-4">The machine you are looking for does not exist.</p>
        <Link to="/products/machines" className="text-blue-600 underline">
          Back to Machines
        </Link>
      </div>
    );
  }

  // Show 3D model button for FR-223 machine and its variants
  const isFR223 = machine.id === "ym-028" || 
                  machine.id === "ym-029" || 
                  machine.id === "ym-030" || 
                  machine.name.toLowerCase().includes("fr 223") ||
                  machine.name.toLowerCase().includes("fr223");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">{machine.name}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <img
            src={machine.imageUrl}
            alt={machine.name}
            className="w-full max-h-96 object-contain rounded-lg shadow-lg"
            loading="lazy"
          />
          
          {isFR223 && (
            <div className="mt-4">
              <Button
                onClick={() => setShow3DModel(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                View 3D Model
              </Button>
            </div>
          )}
        </div>
        
        <div>
          {machine.youtubeUrl && (
            <div className="mb-6 aspect-video w-full">
              <iframe
                src={machine.youtubeUrl}
                title={`${machine.name} Video`}
                className="w-full h-full rounded-lg shadow-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>

      <p className="mb-6 text-lg">{machine.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Technical Details</h3>
          <div className="space-y-2">
            <div><strong>Type:</strong> {machine.type}</div>
            <div><strong>Power:</strong> {machine.powerSpec.consumption} ({machine.powerSpec.voltage})</div>
            <div><strong>Dimensions:</strong> {`${machine.dimensions.length} × ${machine.dimensions.width} × ${machine.dimensions.height}`}</div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Specifications</h3>
          <ul className="list-disc list-inside space-y-1">
            {machine.specifications.map((spec, index) => (
              <li key={index}>{spec}</li>
            ))}
          </ul>
        </div>
      </div>

      {machine.specPdf && (
        <div className="mb-6">
          <Button asChild variant="outline">
            <a 
              href={machine.specPdf} 
              download
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Download Technical Specifications (PDF)
            </a>
          </Button>
        </div>
      )}

      <div className="flex gap-4">
        <Link to="/products/machines" className="text-blue-600 underline">
          Back to Machines
        </Link>
      </div>

      {/* 3D Model Dialog */}
      {isFR223 && (
        <Model3DDialog
          isOpen={show3DModel}
          onClose={() => setShow3DModel(false)}
          machineName={machine.name}
          modelPath="/models/AR-Code-Object-Capture-app-1752786892 (1).glb"
        />
      )}

      <div className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-gradient-orange">{t('reviews.section_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ReviewForm productId={machine.id} onSubmit={handleAddReview} />
          <ReviewList reviews={reviews} />
        </div>
      </div>
    </div>
  );
};

export default MachineDetail;
