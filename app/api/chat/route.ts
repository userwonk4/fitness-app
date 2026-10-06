import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
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

    if (!process.env.GEMINI_API_KEY) {
      console.error('Falta la variable GEMINI_API_KEY');
      return NextResponse.json({ reply: 'Error: Falta configurar GEMINI_API_KEY en Vercel.' }, { status: 200 });
    }

    // Contexto dinámico del usuario
    const contextInfo = userContext ? `
Contexto actual del usuario:
- Peso más reciente: ${userContext.weight || 'Sin registro'}
- Agua consumida hoy: ${userContext.water || '0'} L
- Estado/Molestia de rodilla (1=Dolor, 5=Excelente): ${userContext.kneePain ?? 'Sin reporte'}/5
- Entrenó hoy: ${userContext.workoutDone ? 'Sí' : 'No'}
- Dieta cumplida hoy: ${userContext.mealsDone ? 'Sí' : 'No'}
` : '';

    // Intento opcional de leer historial de Supabase (sin romper la ejecución si falla)
    let history: any[] = [];
    try {
      const { data } = await supabase
        .from('chat_logs')
        .select('role, content')
        .order('created_at', { ascending: true })
        .limit(6);
      if (data) history = data;
    } catch (e) {
      console.warn('No se pudo leer el historial de Supabase:', e);
    }

    // Guardar mensaje del usuario en Supabase (opcional)
    try {
      await supabase.from('chat_logs').insert([{ role: 'user', content: message }]);
    } catch (e) {
      console.warn('No se pudo guardar el mensaje en Supabase:', e);
    }

    // Formatear mensajes para Gemini
    const contents = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

// Intentar llamar a Gemini con modelo principal y fallback si hay sobrecarga
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT + '\n' + contextInfo,
          temperature: 0.7,
        },
      });
    } catch (primaryError: any) {
      console.warn('Modelo principal ocupado, reintentando con fallback:', primaryError?.message);
      
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT + '\n' + contextInfo,
          temperature: 0.7,
        },
      });
    }

    const aiReply = response.text || '¡Dale hermano, a ponerle talento!';

    // Guardar respuesta del asistente en Supabase (opcional)
    try {
      await supabase.from('chat_logs').insert([{ role: 'assistant', content: aiReply }]);
    } catch (e) {
      console.warn('No se pudo guardar la respuesta en Supabase:', e);
    }

    return NextResponse.json({ reply: aiReply });
  } catch (error: any) {
    console.error('Error detallado en el Coach Gemini:', error);
    return NextResponse.json(
      { reply: `Ocurrió un error con el Coach: ${error?.message || 'Revisa la clave de API o la consola.'}` },
      { status: 200 }
    );
  }
}