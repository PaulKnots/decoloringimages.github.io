
import React, { useState, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { fileToBase64 } from '../utils/fileUtils';
import { convertToColoringPage } from '../services/geminiService';

const UploadIcon: React.FC = () => (
  <svg
    className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500"
    stroke="currentColor"
    fill="none"
    viewBox="0 0 48 48"
    aria-hidden="true"
  >
    <path
      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Spinner: React.FC = () => (
  <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center rounded-lg z-10">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500"></div>
      <p className="mt-4 text-slate-600 dark:text-slate-300 font-semibold">Creating your masterpiece...</p>
    </div>
  </div>
);

const ImageProcessor: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImageBase64, setOriginalImageBase64] = useState<string | null>(null);
  const [convertedImageBase64, setConvertedImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lineThickness, setLineThickness] = useState<number>(3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File | null | undefined) => {
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        setError('Invalid file type. Please upload a PNG, JPG, WEBP or SVG.');
        return;
      }
      setOriginalFile(file);
      setError(null);
      setConvertedImageBase64(null);
      try {
        const base64 = await fileToBase64(file);
        setOriginalImageBase64(base64);
      } catch (err) {
        setError('Could not read file.');
        console.error(err);
      }
    }
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await processFile(event.dataTransfer.files?.[0]);
  };

  const handleConvert = useCallback(async () => {
    if (!originalFile || !originalImageBase64) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setConvertedImageBase64(null);
    try {
      const base64Data = originalImageBase64.split(',')[1];
      const mimeType = originalFile.type;
      const resultBase64Data = await convertToColoringPage(base64Data, mimeType, lineThickness);
      if (resultBase64Data) {
        setConvertedImageBase64(`data:image/png;base64,${resultBase64Data}`);
      } else {
        throw new Error('The API did not return an image.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      // Check for 429 or quota errors to give a better message
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
         setError('⚠️ Usage limit reached. The AI service is busy or you have hit the free tier rate limit. Please wait about 60 seconds and try again.');
      } else {
         setError(`Conversion failed: ${errorMessage}`);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [originalFile, originalImageBase64, lineThickness]);

  const handleDownloadPng = () => {
    if (!convertedImageBase64) return;
    const link = document.createElement('a');
    link.href = convertedImageBase64;
    link.download = 'coloring-page.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadPdf = () => {
    if (!convertedImageBase64) return;
    const img = new Image();
    img.src = convertedImageBase64;
    img.onload = () => {
      const imgWidth = img.width;
      const imgHeight = img.height;
      const pageOrientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
      const doc = new jsPDF(pageOrientation, 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageAspectRatio = pageWidth / pageHeight;
      const imageAspectRatio = imgWidth / imgHeight;
      let finalImgWidth, finalImgHeight;
      const margin = 40; 
      const effectiveWidth = pageWidth - 2 * margin;
      const effectiveHeight = pageHeight - 2 * margin;

      if (imageAspectRatio > pageAspectRatio) {
        finalImgWidth = effectiveWidth;
        finalImgHeight = finalImgWidth / imageAspectRatio;
      } else {
        finalImgHeight = effectiveHeight;
        finalImgWidth = finalImgHeight * imageAspectRatio;
      }
      const x = (pageWidth - finalImgWidth) / 2;
      const y = (pageHeight - finalImgHeight) / 2;
      doc.addImage(convertedImageBase64, 'PNG', x, y, finalImgWidth, finalImgHeight);
      doc.save('coloring-page.pdf');
    };
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const uploadAreaClasses = `mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors ${
    isDragging ? 'border-solid border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : ''
  }`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Original Image Pane */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg w-full">
          <h2 className="text-xl font-semibold mb-4 text-center">1. Upload Your Clipart</h2>
          <div
            className={uploadAreaClasses}
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-1 text-center py-8">
              <UploadIcon />
              <div className="flex text-sm text-slate-600 dark:text-slate-400">
                <p className="pl-1">
                    {originalFile ? originalFile.name : 'Click to upload or drag and drop'}
                </p>
                <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp, image/svg+xml"/>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">PNG, JPG, WEBP, SVG up to 10MB</p>
            </div>
          </div>
          {originalImageBase64 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-center mb-2">Original Image</h3>
              <img src={originalImageBase64} alt="Original clipart" className="rounded-lg shadow-md max-h-96 mx-auto" />
            </div>
          )}
        </div>
        
        {/* Converted Image Pane */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg w-full">
          <h2 className="text-xl font-semibold mb-4 text-center">2. Get Your Coloring Page</h2>
          <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400">
            {isLoading && <Spinner />}
            {convertedImageBase64 && !isLoading && (
              <img src={convertedImageBase64} alt="Converted coloring page" className="rounded-lg shadow-md max-h-full max-w-full" />
            )}
            {!convertedImageBase64 && !isLoading && (
                <div className="text-center p-4">
                    <p>Your coloring page will appear here after conversion.</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-md" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Settings & Action Buttons */}
      <div className="sticky bottom-4 z-10 space-y-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg">
          <label htmlFor="line-thickness-slider" className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-center mb-2">
            Line Thickness: <span className="font-bold text-indigo-600 dark:text-indigo-400">{['Very Thin', 'Thin', 'Medium', 'Thick', 'Very Thick'][lineThickness -1]}</span>
          </label>
          <input
            id="line-thickness-slider"
            type="range"
            min="1"
            max="5"
            step="1"
            value={lineThickness}
            onChange={(e) => setLineThickness(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600"
            disabled={isLoading}
          />
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-center gap-4">
          <button
            onClick={handleConvert}
            disabled={!originalFile || isLoading}
            className="w-full md:w-auto flex-1 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100"
          >
            {isLoading ? 'Converting...' : '✨ Convert to Coloring Page'}
          </button>
          <button
            onClick={handleDownloadPng}
            disabled={!convertedImageBase64 || isLoading}
            className="w-full md:w-auto flex-1 bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-emerald-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100"
          >
            Download PNG
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={!convertedImageBase64 || isLoading}
            className="w-full md:w-auto flex-1 bg-rose-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-rose-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageProcessor;
