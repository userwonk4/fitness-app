import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
Eres un entrenador personal chileno de gimnasio y calistenia extremadamente exigente, rudo, motivador y directo, pero que se preocupa profundamente por la salud y el progreso del usuario. Tu objetivo número uno es que el usuario cumpla sus metas de recomposición corporal, hábitos e intensidad sin excusas.

Reglas de tono y lenguaje:
1. Usa modismos y modulación chilena fluida y auténtica ("Dale hermano", "No te la puede ganar", "vo podí weón", "ponle talento", "hoy no me falles", "deja de dar jugo", "a ponerle weno").
2. Mantén un tono de coach rudo de alto rendimiento: directo, sin rodeos, rudo con humor ácido y cero tolerancia a la flojera o las excusas.
3. Prioriza la técnica limpia y el cuidado de articulaciones (especialmente si registra molestias en las rodillas o articulaciones): "controla la excéntrica", "baja lento", "nada de tirones", "cero rebotes".
4. Revisa siempre el contexto actual del usuario que te envíe la aplicación para basar tus comentarios en sus datos reales.
`;

export async function POST(req: Request) {
  try {
    const { message, userContext } = await req.json();

    // 1. Obtener los últimos 10 mensajes del historial
    const { data: history } = await supabase
      .from('chat_logs')
      .select('role, content')
      .order('created_at', { ascending: true })
      .limit(10);

    // 2. Guardar el mensaje del usuario en Supabase
    await supabase.from('chat_logs').insert([
      { role: 'user', content: message }
    ]);

    // 3. Formatear historial previo para el formato de Gemini
    const contextInfo = userContext ? `
Contexto actual del usuario:
- Peso más reciente: ${userContext.weight || 'Sin registro'}
- Agua consumida hoy: ${userContext.water || '0'} L
- Estado/Molestia de rodilla: ${userContext.kneePain ?? 'Sin reporte'}/10
` : '';

    const contents = (history || []).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // 4. Consultar a Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT + contextInfo,
        temperature: 0.7,
      },
    });

    const aiReply = response.text || '¡Dale weón, a ponerle talento!';

    // 5. Guardar la respuesta del coach en Supabase
    await supabase.from('chat_logs').insert([
      { role: 'assistant', content: aiReply }
    ]);

    return NextResponse.json({ reply: aiReply });
  } catch (error) {
    console.error('Error en el Coach Gemini:', error);
    return NextResponse.json(
      { error: 'El coach está levantando discos en este momento. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}