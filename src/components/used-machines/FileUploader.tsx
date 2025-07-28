import React, { useState } from 'react';
import { Button } from '@/shared/ui/ui/button';

const FileUploader = ({ onNext, onBack }) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => file.type.startsWith('image/'));

    if (validFiles.length !== selectedFiles.length) {
      setError('Only image files are allowed.');
    } else {
      setError('');
      setFiles(validFiles);
    }
  };

  const handleNextClick = () => {
    if (files.length === 0) {
      setError('Please upload at least one image.');
    } else {
      onNext({ images: files });
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Upload Machine Photos & Videos</h3>
      <p className="text-gray-400 mb-6">
        Upload clear photos from multiple angles, and a short video of the machine in operation if possible.
        This increases the chances of selling your machine by 70%.
      </p>
      <input type="file" multiple onChange={handleFileChange} />
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleNextClick}>Next</Button>
      </div>
    </div>
  );
};

export default FileUploader;