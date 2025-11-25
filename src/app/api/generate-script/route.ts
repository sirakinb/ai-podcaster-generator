
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { topic, speakers } = await req.json();

        if (!topic || !speakers) {
            return NextResponse.json(
                { error: 'Topic and speakers count are required' },
                { status: 400 }
            );
        }

        const prompt = `Create an engaging podcast script about "${topic}" with ${speakers} speakers. 

CRITICAL RULES:
- DO NOT include ANY emotion indicators like (Excitedly), [laughing], (Laughs), etc.
- DO NOT use parentheses or brackets to describe how someone is speaking
- Just write the actual words the speakers would say
- Let the emotion come through in the dialogue itself, not in stage directions

Guidelines:
- Make it conversational and natural, like real people talking
- Speakers should have distinct personalities and perspectives
- Include natural interruptions, agreements, and disagreements
- Use casual language and expressions
- Make it feel spontaneous and authentic
- Each speaker should contribute meaningfully to the discussion

Format EXACTLY as:
Speaker 1: Their actual dialogue here
Speaker 2: Their actual dialogue here

Example of CORRECT format:
Speaker 1: Man, 2023 was wild! The first half was incredible with DeFi and everything.
Speaker 2: Right? And then it all came crashing down.

Example of INCORRECT format (DO NOT DO THIS):
Speaker 1: (Excitedly) Man, 2023 was wild!
Speaker 2: [laughing] Right?`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });

        const scriptContent = completion.choices[0].message.content;

        if (!scriptContent) {
            throw new Error('Failed to generate script');
        }

        // Save to Supabase
        const { data, error } = await supabase
            .from('podcast_scripts')
            .insert([
                {
                    topic,
                    speakers,
                    script_content: scriptContent,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            console.error('Supabase error details:', JSON.stringify(error, null, 2));
            throw new Error(`Failed to save script to database: ${error.message || JSON.stringify(error)}`);
        }

        return NextResponse.json({ script: data });
    } catch (error) {
        console.error('Error generating script:', error);
        return NextResponse.json(
            { error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
