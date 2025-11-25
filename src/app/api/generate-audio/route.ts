
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { supabase } from '@/lib/supabase';

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

// Map speakers to Voice IDs
// Using some default ElevenLabs voices
const VOICE_IDS = [
    '21m00Tcm4TlvDq8ikWAM', // Rachel
    'AZnzlk1XvdvUeBnXmlld', // Domi
    'EXAVITQu4vr4xnSDxMaL', // Bella
    'TxGEqnHWrfWFTfGW9XjX', // Josh
];

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const scriptId = searchParams.get('scriptId');

    if (!scriptId) {
        return new Response('Missing scriptId', { status: 400 });
    }

    // Fetch script
    const { data: scriptData, error } = await supabase
        .from('podcast_scripts')
        .select('script_content')
        .eq('id', scriptId)
        .single();

    if (error || !scriptData) {
        return new Response('Script not found', { status: 404 });
    }

    const script = scriptData.script_content;

    // Parse script
    // Simple parsing: split by newlines, look for "Speaker N:"
    const lines = script.split('\n').filter((line: string) => line.trim() !== '');

    const stream = new ReadableStream({
        async start(controller) {
            for (const line of lines) {
                const match = line.match(/^Speaker (\d+):(.*)/);
                if (match) {
                    const speakerIndex = parseInt(match[1]) - 1;
                    const text = match[2].trim();
                    // Use modulo to cycle through voices if more speakers than voices
                    const voiceId = VOICE_IDS[speakerIndex % VOICE_IDS.length];

                    try {
                        const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
                            text: text,
                            modelId: 'eleven_multilingual_v2',
                            outputFormat: 'mp3_44100_128',
                        });

                        // audioStream is likely a Web Stream or Node Stream. 
                        // If TS thinks it's a ReadableStream (Web), use getReader.
                        // But if it's a Node stream, we can use 'for await'.
                        // To be safe and satisfy TS if it thinks it's a Web Stream:
                        const reader = (audioStream as any).getReader ? (audioStream as any).getReader() : null;

                        if (reader) {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                controller.enqueue(value);
                            }
                        } else {
                            // Fallback for Node stream
                            for await (const chunk of audioStream as any) {
                                controller.enqueue(chunk);
                            }
                        }
                    } catch (err) {
                        console.error('Error generating audio for line:', line, err);
                    }
                }
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'audio/mpeg' },
    });
}
