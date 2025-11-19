
import React, { useEffect } from 'react';
import ImageProcessor from './components/ImageProcessor';

const Header: React.FC = () => (
  <header className="bg-white dark:bg-slate-800 shadow-md">
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white text-center">
        Clipart to Coloring Book Converter
      </h1>
      <p className="text-center text-slate-600 dark:text-slate-300 mt-2">
        Upload a color clipart and instantly get a printable coloring page.
      </p>
    </div>
  </header>
);

const App: React.FC = () => {
  // Add global event listeners to prevent default browser drag-and-drop behavior
  // This ensures dragging a file outside the drop zone doesn't open it in the browser tab
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <ImageProcessor />
      </main>
      <footer className="text-center p-4 text-sm text-slate-500 dark:text-slate-400">
        <p>Powered by Gemini API</p>
      </footer>
    </div>
  );
};

export default App;
