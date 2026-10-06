'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Droplet, Dumbbell, Utensils, Activity, Scale, CheckCircle2, Circle } from 'lucide-react';
import CoachChat from './components/CoachChat';

const DIET_PLAN = {
  desayuno: '3 huevos enteros + 2 claras + 1 taza de avena con leche/agua + 1 fruta',
  almuerzo: '1 trutro de pollo sin piel (o jurel/atún) + 1 taza de legumbres/arroz + ensalada abundante',
  snack: '1 lata de atún con ensalada o 2 huevos duros + 1 puñado de maní tostado',
  cena: '1 trutro de pollo o jurel + verduras al vapor/sartén + 1 papa mediana cocida',
};

const WORKOUT_ROUTINE: Record<string, { title: string; exercises: string[] }> = {
  'lunes': {
    title: 'Torso / Calistenia y Mancuernas',
    exercises: [
      'Fondos en mini paralelas / Flexiones (4 series x 8-12 reps)',
      'Remo con mancuerna a una mano (4 series x 10-12 reps)',
      'Press militar de hombros con mancuernas (3 series x 10-12 reps)',
      'Dominadas o Remo invertido en paralelas (3 series al fallo)',
      'Super serie Bíceps/Tríceps (3 series x 12 reps)',
    ],
  },
'martes': {
    title: 'Core Rudo + Tren Superior & Cuidado Articular',
    exercises: [
      'Plancha abdominal isométrica (4 series x 45-60 seg)',
      'Flexiones estrictas en mini paralelas (4 series x 10-12 reps - excéntrica lenta)',
      'Elevación de piernas colgado / en paralelas (3 series x 12 reps)',
      'Remo horizontal con mancuernas (4 series x 12 reps)',
      '30 min Bicicleta estática o Caminata a ritmo vivo (Sin impacto)',
      '10 min Movilidad de cadera y estiramientos',
    ],
  },
  'miércoles': {
    title: 'Pierna (Adaptada Rodilla) + Core',
    exercises: [
      'Peso Muerto Rumano con mancuernas (4 series x 10-12 reps)',
      'Puente de glúteo en suelo (4 series x 15 reps)',
      'Sentadilla Goblet (Rango parcial, sin dolor) (3 series x 10-12 reps)',
      'Elevación de talones / Pantorrillas (4 series x 15-20 reps)',
      'Plancha abdominal (3 series x 45-60 seg)',
    ],
  },
'jueves': {
    title: 'Hombros, Core Rudo & Capacidad Aeróbica (Sin Impacto)',
    exercises: [
      'Press militar de hombros con mancuernas (4 series x 10-12 reps)',
      'Elevaciones laterales de hombro (4 series x 12-15 reps)',
      'Plancha Spiderman / Plancha lateral (3 series x 45 seg por lado)',
      'Paseo del granjero con mancuernas pesadas (4 series x 1 min)',
      '30 min Bicicleta estática o Remo ergómetro (Ritmo constante e intenso)',
      '10 min Estiramientos e higiene articular',
    ],
  },
  'viernes': {
    title: 'Full Body / Cuerpo Completo',
    exercises: [
      'Flexiones en mini paralelas (4 series x 10-12 reps)',
      'Remo horizontal a dos manos (4 series x 12 reps)',
      'Elevaciones laterales de hombro (4 series x 12-15 reps)',
      'L-sit asistido o Elevación de piernas en paralelas (3 series x 10-12 reps)',
      'Paseo del granjero con mancuernas (3 series x 1 min)',
    ],
  },
  'sábado': {
    title: 'Descanso Activo',
    exercises: ['Caminata libre, movilidad suave y recuperación.'],
  },
  'domingo': {
    title: 'Descanso Total & Prep de Comidas',
    exercises: ['Descanso total. Preparar compras y cocinar para la semana.'],
  },
};

export default function Dashboard() {
  const [water, setWater] = useState<number>(0);
  const [kneeStatus, setKneeStatus] = useState<number>(5);
  const [workoutDone, setWorkoutDone] = useState<boolean>(false);
  const [mealsDone, setMealsDone] = useState<boolean>(false);
  const [weight, setWeight] = useState<string>('');
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const todayName = days[new Date().getDay()];
  const todayRoutine = WORKOUT_ROUTINE[todayName] || WORKOUT_ROUTINE['domingo'];

  useEffect(() => {
    fetchWeightHistory();
  }, []);

  const fetchWeightHistory = async () => {
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(5);
    if (data) setWeightHistory(data);
  };

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    setLoading(true);

    const dummyUserId = '00000000-0000-0000-0000-000000000000';

    const { error } = await supabase.from('weight_logs').insert([
      { user_id: dummyUserId, weight: parseFloat(weight) }
    ]);

    setLoading(false);
    if (!error) {
      setWeight('');
      fetchWeightHistory();
    } else {
      alert('Error guardando peso. Revisa la conexión con Supabase.');
    }
  };

  // Construcción del contexto dinámico para enviarlo al Coach Gemini
  const currentUserContext = {
    water,
    kneePain: kneeStatus,
    workoutDone,
    mealsDone,
    weight: weightHistory[0]?.weight ? `${weightHistory[0].weight} kg` : null,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-400">Recomposición Corporal</h1>
          <p className="text-slate-400 text-sm capitalize">Hoy es {todayName}</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-xl text-right border border-slate-700/50">
          <span className="text-xs text-slate-400 block">Agua Hoy</span>
          <span className="text-lg font-bold text-cyan-400">{water} / 3.5 L</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* METAS Y HÁBITOS DIARIOS */}
        <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-emerald-400">
            <Activity className="w-5 h-5" /> Metas y Hábitos Diarios
          </h2>

          <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="flex items-center gap-2 text-sm font-medium text-cyan-300">
                <Droplet className="w-4 h-4" /> Consumo de Agua
              </span>
              <span className="text-xs text-slate-400">{water.toFixed(1)} / 3.5 Litros</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setWater(prev => Math.min(3.5, prev + 0.5))}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs py-1.5 px-3 rounded-lg font-medium transition"
              >
                +0.5 L
              </button>
              <button
                onClick={() => setWater(0)}
                className="bg-slate-700 text-slate-300 text-xs py-1.5 px-3 rounded-lg hover:bg-slate-600"
              >
                Reiniciar
              </button>
            </div>
          </div>

          <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <label className="text-sm font-medium text-amber-300 block mb-2">
              Estado de Rodilla Izquierda (1 = Dolor, 5 = Excelente)
            </label>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setKneeStatus(lvl)}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-sm transition ${
                    kneeStatus === lvl
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setWorkoutDone(!workoutDone)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 transition border border-slate-800"
            >
              <span className="text-sm font-medium">Completar Entrenamiento del día</span>
              {workoutDone ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5 text-slate-500" />}
            </button>
            <button
              onClick={() => setMealsDone(!mealsDone)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 transition border border-slate-800"
            >
              <span className="text-sm font-medium">Cumplir Plan de Alimentación</span>
              {mealsDone ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5 text-slate-500" />}
            </button>
          </div>
        </section>

        {/* RUTINA DEL DÍA */}
        <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50">
          <h2 className="text-xl font-semibold mb-1 flex items-center gap-2 text-indigo-400">
            <Dumbbell className="w-5 h-5" /> Rutina de Hoy
          </h2>
          <p className="text-xs text-indigo-300 font-medium mb-4 capitalize">{todayRoutine.title}</p>

          <ul className="space-y-2.5">
            {todayRoutine.exercises.map((ex, idx) => (
              <li key={idx} className="bg-slate-900/60 p-3 rounded-xl text-xs md:text-sm text-slate-300 border border-slate-800/80 flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* PLAN DE ALIMENTACIÓN */}
        <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-amber-400">
            <Utensils className="w-5 h-5" /> Alimentación Diaria (Económica)
          </h2>
          <div className="space-y-3 text-xs md:text-sm">
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <strong className="text-amber-300 block mb-1">Desayuno:</strong>
              <p className="text-slate-300">{DIET_PLAN.desayuno}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <strong className="text-amber-300 block mb-1">Almuerzo:</strong>
              <p className="text-slate-300">{DIET_PLAN.almuerzo}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <strong className="text-amber-300 block mb-1">Snack:</strong>
              <p className="text-slate-300">{DIET_PLAN.snack}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <strong className="text-amber-300 block mb-1">Cena:</strong>
              <p className="text-slate-300">{DIET_PLAN.cena}</p>
            </div>
          </div>
        </section>

        {/* SEGUIMIENTO DE PESO */}
        <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-cyan-400">
            <Scale className="w-5 h-5" /> Tracking de Peso Semanal
          </h2>

          <form onSubmit={handleLogWeight} className="flex gap-2 mb-6">
            <input
              type="number"
              step="0.1"
              placeholder="Ej: 82.5 kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500 text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              Registrar
            </button>
          </form>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Últimos registros</h3>
            <div className="space-y-2">
              {weightHistory.length === 0 ? (
                <p className="text-xs text-slate-500">No hay registros aún.</p>
              ) : (
                weightHistory.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg text-xs border border-slate-800">
                    <span className="text-slate-400">{item.logged_at}</span>
                    <span className="font-bold text-emerald-400">{item.weight} kg</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* COACH CON IA CHILENO */}
        <section className="md:col-span-2 mt-4">
          <CoachChat userContext={currentUserContext} />
        </section>

      </main>
    </div>
  );
}