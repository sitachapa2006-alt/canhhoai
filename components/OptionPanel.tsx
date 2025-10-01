import React, { useCallback, useState } from 'react';
import type { OptionState } from '../types';
import RadioCard from './RadioCard';

interface OptionPanelProps {
    title: string;
    options: string[];
    state: OptionState;
    setState: React.Dispatch<React.SetStateAction<OptionState>>;
    allowCustomUpload?: boolean;
}

const OptionPanel: React.FC<OptionPanelProps> = ({ title, options, state, setState, allowCustomUpload = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    
    const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setState(prev => ({ ...prev, enabled: e.target.checked }));
    };

    const handleValueChange = (clickedValue: string) => {
        setState(prev => {
            // If the clicked option is already selected, deselect it by setting value to empty.
            if (prev.value === clickedValue) {
                return { ...prev, value: '' };
            }
            // Otherwise, select the new option and clear any custom files for this category.
            return { ...prev, value: clickedValue, customFiles: [] };
        });
    };
    
    const handleCustomRequestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setState(prev => ({ ...prev, customRequest: e.target.value }));
    };

    const handleFiles = useCallback((acceptedFiles: FileList | null) => {
        if (acceptedFiles) {
            const newFiles = Array.from(acceptedFiles)
                .filter(file => file.type.startsWith('image/'))
                .map(file => ({
                    file,
                    preview: URL.createObjectURL(file),
                }));
            setState(prev => {
                const existingFiles = prev.customFiles || [];
                const uniqueNewFiles = newFiles.filter(nf => !existingFiles.some(ef => ef.file.name === nf.file.name && ef.file.size === nf.file.size));
                return {
                    ...prev,
                    customFiles: [...existingFiles, ...uniqueNewFiles],
                    value: 'Custom' 
                };
            });
        }
    }, [setState]);

    const removeFile = (fileName: string) => {
        setState(prev => {
            const updatedFiles = prev.customFiles.filter(f => f.file.name !== fileName);
            return {
                ...prev,
                customFiles: updatedFiles,
            };
        });
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

    const dropzoneClass = `flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        isDragging ? 'border-purple-500 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
    }`;
    
    return (
        <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/50">
            <div className="flex items-center justify-between">
                <label htmlFor={`enable-${title}`} className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        id={`enable-${title}`}
                        checked={state.enabled}
                        onChange={handleEnabledChange}
                        className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-lg font-semibold text-gray-200">{title}</span>
                </label>
            </div>
            {state.enabled && (
                <>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {options.map(option => (
                            <RadioCard
                                key={option}
                                id={`option-${title}-${option}`}
                                name={`option-${title}`}
                                value={option}
                                checked={state.value === option}
                                onChange={() => handleValueChange(option)}
                                label={option.split('(')[0]}
                            />
                        ))}
                    </div>

                    <div className="mt-4 space-y-4">
                        {allowCustomUpload && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Tải lên ảnh tùy chỉnh
                                </label>
                                <div className="flex items-center justify-center w-full">
                                    <label 
                                        htmlFor={`dropzone-file-${title}`} 
                                        className={dropzoneClass}
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    >
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <svg className="w-6 h-6 mb-1 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" /></svg>
                                            <p className="text-xs text-gray-400"><span className="font-semibold">Nhấp hoặc kéo</span></p>
                                        </div>
                                        <input id={`dropzone-file-${title}`} type="file" className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} accept="image/png, image/jpeg, image/webp" />
                                    </label>
                                </div>
                                {state.customFiles && state.customFiles.length > 0 && (
                                    <div className="mt-2 grid grid-cols-4 sm:grid-cols-5 gap-2">
                                        {state.customFiles.map((file, index) => (
                                            <div key={index} className="relative group">
                                                <img src={file.preview} alt={`preview ${index}`} className="w-full h-16 object-cover rounded-md" />
                                                <button
                                                    onClick={() => removeFile(file.file.name)}
                                                    className="absolute top-0.5 right-0.5 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    aria-label="Remove image"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div>
                            <label htmlFor={`custom-request-${title}`} className="block text-sm font-medium text-gray-400 mb-2">
                                Yêu cầu thêm cho mục này
                            </label>
                            <input
                                id={`custom-request-${title}`}
                                type="text"
                                value={state.customRequest || ''}
                                onChange={handleCustomRequestChange}
                                placeholder="ví dụ: phong cách hiện đại, màu đỏ..."
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OptionPanel;