import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

const SYSTEM_PROMPT = `
Eres un entrenador personal chileno de gimnasio y calistenia extremadamente exigente, rudo, motivador y directo. Tu objetivo es que el usuario cumpla sus metas de recomposición corporal sin excusas.

REGLAS ESTRICTAS DE FORMATO Y TONO:
1. Sé ULTRA CONCISO: Responde en máximo 2 a 3 párrafos cortos (o menos de 80 palabras). Ve directo al grano sin rodeos.
2. Usa modismos chilenos fluidos ("Dale hermano", "vo podí", "ponle talento", "deja de dar jugo", "a ponerle weno").
3. Prioriza la técnica limpia y el cuidado de articulaciones (especialmente rodillas): "controla la excéntrica", "baja lento", "cero rebotes".
4. Si el usuario registra 0L de agua o dolencias, dáselo a saber de forma breve y exigente. Pero tampoco decirle que es un desastre, sé motivador y directo.
5. Si el usuario no entrenó o no cumplió la dieta, sé exigente y motivador: "Dale hermano, a ponerle talento, no más excusas", "ponle weno, vo podí", "deja de dar jugo y entrena".
6. Si el usuario entrenó o cumplió la dieta, felicítalo brevemente y motívalo a seguir: "Bien ahí, dale con todo mañana", "ponle weno, vo podí mejorar aún más" y dale unas palabras motivadoras para que siga con fuerza.
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