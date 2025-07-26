import React, { useState, useRef } from 'react';
import { Button } from '../../shared/ui/ui/button';

const FileUploader = () => {
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArray]);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideo(e.target.files[0]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideo(null);
  };

  return (
    <div className="text-right">
      <div className="mb-4">
        <label className="block mb-2 font-semibold">رفع صور الماكينة (يمكن رفع عدة صور)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          ref={imageInputRef}
          className="hidden"
          id="image-upload"
        />
        <Button onClick={() => imageInputRef.current?.click()}>اختر صور</Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {images.map((image, index) => {
          const url = URL.createObjectURL(image);
          return (
            <div key={index} className="relative w-24 h-24 border rounded overflow-hidden">
              <img src={url} alt={`Uploaded ${index}`} className="object-cover w-full h-full" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                aria-label="Remove image"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">رفع فيديو (اختياري)</label>
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          ref={videoInputRef}
          className="hidden"
          id="video-upload"
        />
        <Button onClick={() => videoInputRef.current?.click()}>اختر فيديو</Button>
      </div>

      {video && (
        <div className="relative w-48 h-32 border rounded overflow-hidden mb-4">
          <video src={URL.createObjectURL(video)} controls className="w-full h-full" />
          <button
            type="button"
            onClick={removeVideo}
            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
            aria-label="Remove video"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
