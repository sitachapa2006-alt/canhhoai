import React, { useCallback, useState, useEffect } from 'react';
import type { FileWithPreview } from '../types';

interface ImageUploaderProps {
    files: FileWithPreview[];
    setFiles: React.Dispatch<React.SetStateAction<FileWithPreview[]>>;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ files, setFiles }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFiles = useCallback((acceptedFiles: FileList | null) => {
        if (acceptedFiles) {
            const newFiles = Array.from(acceptedFiles)
                .filter(file => file.type.startsWith('image/'))
                .map(file => ({
                    file,
                    preview: URL.createObjectURL(file),
                }));
            setFiles(prev => [...prev, ...newFiles]);
        }
    }, [setFiles]);

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            const imageFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        imageFiles.push(file);
                    }
                }
            }

            if (imageFiles.length > 0) {
                const dataTransfer = new DataTransfer();
                imageFiles.forEach(file => dataTransfer.items.add(file));
                handleFiles(dataTransfer.files);
            }
        };

        window.addEventListener('paste', handlePaste);

        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [handleFiles]);


    const removeFile = (fileName: string) => {
        setFiles(files => files.filter(file => file.file.name !== fileName));
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            handleFiles(droppedFiles);
        }
    };

    const dropzoneClass = `flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        isDragging ? 'border-purple-500 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
    }`;

    return (
        <div>
            <label className="block text-lg font-semibold text-gray-200 mb-2">
                Nhân vật
            </label>
            <div className="flex items-center justify-center w-full">
                <label
                    htmlFor="dropzone-file"
                    className={dropzoneClass}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" /></svg>
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Nhấp, kéo thả</span> hoặc dán ảnh</p>
                        <p className="text-xs text-gray-500">PNG, JPG, hoặc WEBP</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} accept="image/png, image/jpeg, image/webp" />
                </label>
            </div>
            {files.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {files.map((file, index) => (
                        <div key={index} className="relative group">
                            <img src={file.preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-md" />
                            <button
                                onClick={() => removeFile(file.file.name)}
                                className="absolute top-1 right-1 bg-red-600/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageUploader;