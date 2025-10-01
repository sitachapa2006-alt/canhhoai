import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateCompositeImage, removeImageBackground } from './services/geminiService';
import { clothingOptions, backgroundOptions, vehicleOptions, celebrityOptions, weatherOptions } from './constants';
import type { OptionState, FileWithPreview } from './types';
import ImageUploader from './components/ImageUploader';
import OptionPanel from './components/OptionPanel';
import Spinner from './components/Spinner';
import ImageComparator from './components/ImageComparator';


// --- Component xem trước ảnh ---
interface ImagePreviewProps {
  imageSrc: string;
  onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageSrc, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden'; // Ngăn cuộn nền

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto'; // Khôi phục cuộn
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 animate-fade-in-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
        <style>{`
            @keyframes fade-in-backdrop {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in-backdrop {
                animation: fade-in-backdrop 0.3s ease-out forwards;
            }
            @keyframes scale-up-content {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .animate-scale-up-content {
                animation: scale-up-content 0.3s ease-out forwards;
            }
        `}</style>
      <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30 transition-colors z-50"
          aria-label="Đóng"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      <div className="relative max-w-5xl w-full max-h-[90vh] animate-scale-up-content" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageSrc}
          alt="Xem trước ảnh"
          className="rounded-lg object-contain w-full h-full max-h-[90vh]"
        />
      </div>
    </div>
  );
};


const App: React.FC = () => {
    const [characterImages, setCharacterImages] = useState<FileWithPreview[]>([]);
    const [clothing, setClothing] = useState<OptionState>({ enabled: false, value: '', customFiles: [], customRequest: '' });
    const [background, setBackground] = useState<OptionState>({ enabled: false, value: '', customFiles: [], customRequest: '' });
    const [vehicle, setVehicle] = useState<OptionState>({ enabled: false, value: '', customFiles: [], customRequest: '' });
    const [celebrity, setCelebrity] = useState<OptionState>({ enabled: false, value: '', customFiles: [], customRequest: '' });
    const [weather, setWeather] = useState<OptionState>({ enabled: false, value: '', customFiles: [], customRequest: '' });
    const [additionalRequest, setAdditionalRequest] = useState('');
    const [adjustSkinTone, setAdjustSkinTone] = useState(false);
    const [applyMakeup, setApplyMakeup] = useState(false);

    const [requestHistory, setRequestHistory] = useState<string[]>([]);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const historyRef = useRef<HTMLDivElement>(null);

    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [retryDelay, setRetryDelay] = useState(60); // Start with a 60s delay
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [comparisonImages, setComparisonImages] = useState<{ original: string; generated: string } | null>(null);
    const [bgRemovalState, setBgRemovalState] = useState<Record<number, boolean>>({});
    const [isBgRemoved, setIsBgRemoved] = useState<Record<number, boolean>>({});


    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('requestHistory');
            if (savedHistory) {
                setRequestHistory(JSON.parse(savedHistory));
            }
        } catch (err) {
            console.error("Không thể tải lịch sử yêu cầu từ localStorage", err);
        }
    }, []);

    // Save history to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('requestHistory', JSON.stringify(requestHistory));
        } catch (err) {
            console.error("Không thể lưu lịch sử yêu cầu vào localStorage", err);
        }
    }, [requestHistory]);
    
    // Handle clicks outside the history dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
                setIsHistoryVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleGenerateSuggestion = useCallback(() => {
        const parts: string[] = [];
    
        const processOption = (option: OptionState, description: string) => {
            if (option.enabled) {
                let part = '';
                if (option.customFiles.length > 0) {
                    part = `${description} như trong ảnh đã tải lên`;
                } else if (option.value) {
                    part = `${description} ${option.value.split('(')[0].trim()}`;
                }
    
                if (option.customRequest) {
                    part += ` (${option.customRequest})`;
                }
                
                if (part.trim()) {
                    parts.push(part.trim() + '.');
                }
            }
        };
    
        if (characterImages.length > 0) {
            parts.push(`Một khung cảnh có ${characterImages.length} nhân vật.`);
        }
    
        processOption(clothing, 'Mặc');
        processOption(background, 'Bối cảnh là');
        processOption(vehicle, 'Có một chiếc');
        processOption(celebrity, 'Đi cùng với');
        processOption(weather, 'Thời tiết là');
    
        setAdditionalRequest(parts.join(' '));
    }, [characterImages.length, clothing, background, vehicle, celebrity, weather]);

    const handleSubmit = useCallback(async () => {
        if (characterImages.length === 0) {
            setError('Vui lòng tải lên ít nhất một ảnh nhân vật.');
            return;
        }
        
        setError(null);
        setIsLoading(true);
        setGeneratedImages([]);
        setIsBgRemoved({});

        try {
            const results = await generateCompositeImage({
                characterImages: characterImages.map(f => f.file),
                clothing,
                background,
                vehicle,
                celebrity,
                weather,
                additionalRequest,
                adjustSkinTone,
                applyMakeup,
                onProgress: (current, total) => {
                    setProgress(`Đang tạo ảnh ${current} trên ${total}...`);
                }
            });
            setGeneratedImages(results.map(img => `data:image/png;base64,${img}`));
            
            const trimmedRequest = additionalRequest.trim();
            if (trimmedRequest) {
                setRequestHistory(prev => {
                    const filtered = prev.filter(item => item !== trimmedRequest);
                    const newHistory = [trimmedRequest, ...filtered].slice(0, 20);
                    return newHistory;
                });
            }

            setRetryDelay(60); 
        } catch (err) {
            console.error(err);
            let errorMessage = 'Đã xảy ra lỗi không mong muốn khi tạo ảnh.';
            if (err instanceof Error) {
                 const message = err.message.toLowerCase();
                 if (message.includes('429') || message.includes('quota') || message.includes('resource_exhausted')) {
                    errorMessage = 'Đã hết hạn ngạch API. Vui lòng đợi hết thời gian chờ trước khi thử lại.';
                    setCooldown(retryDelay);
                    setRetryDelay(prev => Math.min(prev * 2, 300)); 
                } else {
                    errorMessage = err.message;
                    setRetryDelay(60);
                }
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setProgress(null);
        }
    }, [characterImages, clothing, background, vehicle, celebrity, weather, additionalRequest, retryDelay, adjustSkinTone, applyMakeup]);

    const handleRemoveBackground = useCallback(async (index: number) => {
        const imageSrc = generatedImages[index];
        if (!imageSrc) return;

        setBgRemovalState(prev => ({ ...prev, [index]: true }));
        setError(null);

        try {
            const base64Data = imageSrc.split(',')[1];
            const resultBase64 = await removeImageBackground(base64Data);
            const newImageSrc = `data:image/png;base64,${resultBase64}`;
            
            setGeneratedImages(prev => prev.map((img, i) => i === index ? newImageSrc : img));
            setIsBgRemoved(prev => ({ ...prev, [index]: true }));

        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'Không thể xóa nền ảnh. Vui lòng thử lại.';
            setError(errorMessage);
        } finally {
            setBgRemovalState(prev => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
            });
        }
    }, [generatedImages]);

    const handleDownload = useCallback((imageSrc: string, index: number) => {
        const link = document.createElement('a');
        const filename = isBgRemoved[index]
          ? `phucanh_mrt_image_${index + 1}_no_bg.png`
          : `phucanh_mrt_image_${index + 1}.png`;
        link.href = imageSrc;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [isBgRemoved]);


    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Trình Tạo Ảnh AI Chuyên Nghiệp
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">
                        Công cụ AI Tạo Ảnh tự động không cần prompt cầu kỳ, hãy kết nối với{' '}
                        <a 
                            href="https://facebook.com/qcdcanh2510" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 transition-colors font-semibold"
                        >
                            Cảnh Design
                        </a>
                        {' '}để học thêm nhé
                    </p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 shadow-lg">
                        <ImageUploader files={characterImages} setFiles={setCharacterImages} />

                        <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/50">
                            <h3 className="text-lg font-semibold text-gray-200 mb-3">Hiệu chỉnh nhân vật</h3>
                            <div className="space-y-3">
                                <label htmlFor="adjust-skin-tone" className={`flex items-center space-x-3 ${characterImages.length === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        id="adjust-skin-tone"
                                        checked={adjustSkinTone}
                                        onChange={(e) => setAdjustSkinTone(e.target.checked)}
                                        disabled={characterImages.length === 0}
                                        className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-gray-300 ${characterImages.length === 0 ? 'text-gray-500' : ''}`}>Tự động cân chỉnh màu da</span>
                                </label>
                                <label htmlFor="apply-makeup" className={`flex items-center space-x-3 ${characterImages.length === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        id="apply-makeup"
                                        checked={applyMakeup}
                                        onChange={(e) => setApplyMakeup(e.target.checked)}
                                        disabled={characterImages.length === 0}
                                        className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-gray-300 ${characterImages.length === 0 ? 'text-gray-500' : ''}`}>Tự động trang điểm nhẹ nhàng (nữ)</span>
                                </label>
                            </div>
                        </div>

                        <OptionPanel title="Trang phục" options={clothingOptions} state={clothing} setState={setClothing} allowCustomUpload />
                        <OptionPanel title="Bối cảnh" options={backgroundOptions} state={background} setState={setBackground} allowCustomUpload />
                        <OptionPanel title="Xe cộ" options={vehicleOptions} state={vehicle} setState={setVehicle} allowCustomUpload />
                        <OptionPanel title="Người nổi tiếng" options={celebrityOptions} state={celebrity} setState={setCelebrity} allowCustomUpload />
                        <OptionPanel title="Thời tiết" options={weatherOptions} state={weather} setState={setWeather} />

                        <div className="relative" ref={historyRef}>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="additional-request" className="block text-sm font-medium text-gray-300">Yêu cầu chung</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsHistoryVisible(prev => !prev)}
                                        className="text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-purple-300 font-semibold py-1 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={requestHistory.length === 0}
                                        aria-label="Xem lịch sử yêu cầu"
                                    >
                                        Lịch sử
                                    </button>
                                    <button 
                                        onClick={handleGenerateSuggestion}
                                        className="text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-purple-300 font-semibold py-1 px-3 rounded-md transition-colors"
                                        aria-label="Gợi ý prompt dựa trên các lựa chọn hiện tại"
                                    >
                                        Gợi ý Prompt
                                    </button>
                                </div>
                            </div>

                            {isHistoryVisible && requestHistory.length > 0 && (
                                <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                    <div className="flex justify-end p-1 border-b border-gray-700">
                                        <button
                                            onClick={() => { setRequestHistory([]); setIsHistoryVisible(false); }}
                                            className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded"
                                        >
                                            Xóa lịch sử
                                        </button>
                                    </div>
                                    <ul className="divide-y divide-gray-700">
                                        {requestHistory.map((item, index) => (
                                            <li key={index} 
                                                className="p-2 text-sm text-gray-300 hover:bg-purple-900/50 cursor-pointer truncate"
                                                title={item}
                                                onClick={() => {
                                                    setAdditionalRequest(item);
                                                    setIsHistoryVisible(false);
                                                }}
                                            >
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <textarea
                                id="additional-request"
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                                placeholder="ví dụ: làm nhân vật cười, thêm yếu tố tương lai..."
                                value={additionalRequest}
                                onChange={(e) => setAdditionalRequest(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || characterImages.length === 0 || cooldown > 0}
                            className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
                        >
                            {isLoading ? (
                                <><Spinner /> {progress || 'Đang tạo...'}</>
                            ) : cooldown > 0 ? (
                                `Thử lại sau ${cooldown} giây`
                            ) : (
                                'Tạo 4 ảnh'
                            )}
                        </button>
                    </div>

                    <div className="flex justify-center items-center bg-gray-800/50 rounded-2xl border border-gray-700 p-6 min-h-[500px] lg:min-h-full">
                        {isLoading && (
                            <div className="text-center">
                                <Spinner className="w-16 h-16 mx-auto" />
                                <p className="mt-4 text-lg text-gray-400">{progress || 'AI đang tạo nên kiệt tác của bạn...'}</p>
                                <p className="text-sm text-gray-500">Quá trình này có thể mất một vài phút.</p>
                            </div>
                        )}
                        {error && <p className="text-red-400 text-center">{error}</p>}
                        {!isLoading && generatedImages.length === 0 && (
                             <div className="text-center text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="mt-2 text-lg">Ảnh được tạo của bạn sẽ xuất hiện ở đây.</p>
                            </div>
                        )}
                        {generatedImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 w-full h-full">
                                {generatedImages.map((imageSrc, index) => (
                                    <div 
                                      key={index} 
                                      className="relative group aspect-square cursor-pointer overflow-hidden rounded-lg"
                                      onClick={() => setSelectedImage(imageSrc)}
                                    >
                                        <img src={imageSrc} alt={`Ảnh được tạo ${index + 1}`} className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex justify-center items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                            </svg>
                                        </div>
                                        <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveBackground(index);
                                                }}
                                                disabled={!!bgRemovalState[index]}
                                                className="flex items-center justify-center w-9 h-9 bg-blue-600 text-white font-bold p-1.5 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-wait"
                                                title="Xóa nền ảnh"
                                                aria-label={`Xóa nền ảnh ${index + 1}`}
                                            >
                                                {bgRemovalState[index] ? (
                                                    <Spinner className="w-5 h-5" />
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L8 0l-2 3-3 2 3 2 2 3 2-3 3-2-3-2zm9 7l-1.5-3L16 7l-1.5 3L13 11.5l1.5 1.5L16 16l1.5-3L19 11.5l1.5-1.5z"></path></svg>
                                                )}
                                            </button>
                                            {characterImages.length > 0 && (
                                                 <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setComparisonImages({ original: characterImages[0].preview, generated: imageSrc });
                                                    }}
                                                    className="flex items-center justify-center w-9 h-9 bg-gray-700 text-white font-bold p-1.5 rounded-lg hover:bg-gray-600 transition-all"
                                                    title="So sánh với ảnh gốc"
                                                    aria-label={`So sánh ảnh ${index + 1} với ảnh gốc`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(imageSrc, index);
                                                }}
                                                className="flex items-center justify-center w-9 h-9 bg-purple-600 text-white font-bold p-1.5 rounded-lg hover:bg-purple-700 transition-all"
                                                title="Tải xuống"
                                                aria-label={`Tải xuống ảnh ${index + 1}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
                <footer className="text-center py-4 mt-8">
                    <p className="text-sm text-gray-500">
                        Hãy kết nối với{' '}
                        <a 
                            href="https://facebook.com/qcdcanh2510" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            Cảnh Design
                        </a>
                    </p>
                </footer>
            </div>
            {selectedImage && <ImagePreview imageSrc={selectedImage} onClose={() => setSelectedImage(null)} />}
            {comparisonImages && <ImageComparator originalImage={comparisonImages.original} generatedImage={comparisonImages.generated} onClose={() => setComparisonImages(null)} />}
        </div>
    );
};

export default App;