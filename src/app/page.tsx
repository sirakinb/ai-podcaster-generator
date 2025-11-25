
'use client';

import { useState, useRef } from 'react';
import PodcastPlayer from '@/components/PodcastPlayer';
import { Mic, Users, FileText, Sparkles, Upload, Download } from 'lucide-react';
import { AudioMixer } from '@/lib/audioMixer';

export default function Home() {
    const [topic, setTopic] = useState('');
    const [speakers, setSpeakers] = useState(2);
    const [isGenerating, setIsGenerating] = useState(false);
    const [scriptId, setScriptId] = useState<number | null>(null);
    const [scriptContent, setScriptContent] = useState('');
    const [introFile, setIntroFile] = useState<File | null>(null);
    const [outroFile, setOutroFile] = useState<File | null>(null);
    const [podcastAudio, setPodcastAudio] = useState<Blob | null>(null);
    const [finalAudio, setFinalAudio] = useState<Blob | null>(null);
    const [isMixing, setIsMixing] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleGenerate = async () => {
        if (!topic) return;

        setIsGenerating(true);
        setScriptId(null);
        setScriptContent('');
        setPodcastAudio(null);
        setFinalAudio(null);

        try {
            const res = await fetch('/api/generate-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, speakers }),
            });

            const data = await res.json();

            if (data.error) {
                alert(data.error);
                return;
            }

            setScriptContent(data.script.script_content);
            setScriptId(data.script.id);

            // Fetch the generated audio
            await fetchPodcastAudio(data.script.id);
        } catch (error) {
            console.error(error);
            alert('Failed to generate podcast');
        } finally {
            setIsGenerating(false);
        }
    };

    const fetchPodcastAudio = async (id: number) => {
        try {
            const response = await fetch(`/api/generate-audio?scriptId=${id}`);
            const audioBlob = await response.blob();
            setPodcastAudio(audioBlob);

            // Auto-mix if no intro/outro
            if (!introFile && !outroFile) {
                setFinalAudio(audioBlob);
            }
        } catch (error) {
            console.error('Error fetching audio:', error);
        }
    };

    const handleMixAudio = async () => {
        if (!podcastAudio) return;

        setIsMixing(true);
        try {
            const mixer = new AudioMixer(2); // 2 second fade
            const mixed = await mixer.mixAudio({
                intro: introFile || undefined,
                podcast: podcastAudio,
                outro: outroFile || undefined,
            });
            setFinalAudio(mixed);
            mixer.destroy();
        } catch (error) {
            console.error('Error mixing audio:', error);
            alert('Failed to mix audio');
        } finally {
            setIsMixing(false);
        }
    };

    const handleDownload = () => {
        if (!finalAudio) return;

        const url = URL.createObjectURL(finalAudio);
        const a = document.createElement('a');
        a.href = url;
        a.download = `podcast-${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 bg-black rounded-2xl mb-4 shadow-xl">
                        <Mic className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tight text-gray-900">
                        Podcrafter
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        Turn any article or topic into an engaging multi-speaker podcast episode instantly.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-start">
                    <div className="space-y-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <FileText className="w-4 h-4" />
                                    Topic or Article Content
                                </label>
                                <textarea
                                    className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none text-gray-800 placeholder-gray-400"
                                    placeholder="Paste your article text or describe a topic here..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <Users className="w-4 h-4" />
                                    Number of Speakers: {speakers}
                                </label>
                                <input
                                    type="range"
                                    min="2"
                                    max="4"
                                    value={speakers}
                                    onChange={(e) => setSpeakers(parseInt(e.target.value))}
                                    className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-400 font-medium">
                                    <span>2 Speakers</span>
                                    <span>3 Speakers</span>
                                    <span>4 Speakers</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <Upload className="w-4 h-4" />
                                    Intro Audio (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => setIntroFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
                                />
                                {introFile && <p className="text-xs text-gray-500">✓ {introFile.name}</p>}
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <Upload className="w-4 h-4" />
                                    Outro Audio (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => setOutroFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
                                />
                                {outroFile && <p className="text-xs text-gray-500">✓ {outroFile.name}</p>}
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !topic}
                                className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <Sparkles className="w-5 h-5 animate-spin" />
                                        Generating Script...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate Podcast
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {podcastAudio && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-4">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Mic className="w-5 h-5" />
                                        Podcast Audio
                                    </h3>

                                    <audio
                                        ref={audioRef}
                                        controls
                                        className="w-full mb-4"
                                        src={finalAudio ? URL.createObjectURL(finalAudio) : undefined}
                                    />

                                    {(introFile || outroFile) && !finalAudio && (
                                        <button
                                            onClick={handleMixAudio}
                                            disabled={isMixing}
                                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                        >
                                            {isMixing ? (
                                                <>
                                                    <Sparkles className="w-5 h-5 animate-spin" />
                                                    Mixing Audio...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-5 h-5" />
                                                    Mix with Intro/Outro
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {finalAudio && (
                                        <button
                                            onClick={handleDownload}
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Download className="w-5 h-5" />
                                            Download Podcast
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {scriptContent && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Generated Script
                                </h3>
                                <div className="prose prose-sm max-w-none h-96 overflow-y-auto pr-2 custom-scrollbar">
                                    <pre className="whitespace-pre-wrap font-sans text-gray-600 leading-relaxed">
                                        {scriptContent}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {!scriptContent && !isGenerating && (
                            <div className="h-full flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-2xl p-12 min-h-[400px]">
                                <div className="text-center">
                                    <Mic className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Generated podcast will appear here</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
