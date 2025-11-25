
'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

export default function PodcastPlayer({ scriptId }: { scriptId: number }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
            setIsLoading(true);
        }
    }, [scriptId]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
        }
    };

    return (
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Podcast Player</h3>
                {isLoading && <span className="text-sm text-blue-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading audio...</span>}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-4">
                <audio
                    ref={audioRef}
                    className="w-full hidden"
                    src={`/api/generate-audio?scriptId=${scriptId}`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onCanPlay={() => setIsLoading(false)}
                    onWaiting={() => setIsLoading(true)}
                />

                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={togglePlay}
                        className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg"
                    >
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </button>
                </div>

                <div className="text-center text-sm text-gray-500">
                    {isPlaying ? 'Playing generated podcast...' : 'Ready to play'}
                </div>
            </div>
        </div>
    );
}
