// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/ui/BottomNav";
import {
  Users,
  PlusCircle,
  QrCode,
  Map,
  LogOut,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Clock,
  Warehouse
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Função para pluralizar nomes das aves automaticamente
function pluralize(count: number, word: string) {
  if (count <= 1) return word;
  const w = word.trim();
  if (w.toLowerCase() === "indefinido") return "Indefinidos";
  if (w.endsWith("ão")) return w.replace(/ão$/, "ões");
  if (w.endsWith("m")) return w.replace(/m$/, "ns");
  if (w.endsWith("l")) return w.replace(/l$/, "is");
  if (w.endsWith("r") || w.endsWith("z")) return w + "es";
  if (!w.endsWith("s")) return w + "s";
  return w;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [totalBirds, setTotalBirds] = useState(0);
  const [speciesCounts, setSpeciesCounts] = useState<
    { id: string; name: string; count: number }[]
  >([]);

  const [reminders, setReminders] = useState<any[]>([]);
  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderDate, setNewReminderDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // 1. Total de aves e contagem por espécie
      const { data: birdsData } = await supabase
        .from("birds")
        .select("species (id, name)")
        .eq("status", "ACTIVE");

      if (birdsData) {
        setTotalBirds(birdsData.length);

        const countsMap: Record<
          string,
          { id: string; name: string; count: number }
        > = {};

        birdsData.forEach((bird: any) => {
          const spId = bird.species?.id || "indef";
          const spName = bird.species?.name || "Indefinido";

          if (!countsMap[spId]) {
            countsMap[spId] = { id: spId, name: spName, count: 0 };
          }
          countsMap[spId].count += 1;
        });

        // Converte em array e ordena da maior quantidade para a menor
        setSpeciesCounts(
          Object.values(countsMap).sort((a, b) => b.count - a.count),
        );
      }

      // 2. Lembretes pendentes
      const { data: remindersData } = await supabase
        .from("reminders")
        .select("*")
        .eq("completed", false)
        .order("due_date", { ascending: true });

      if (remindersData) setReminders(remindersData);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        user_id: user.id,
        title: newReminderText,
        due_date: newReminderDate,
        completed: false,
      })
      .select()
      .single();

    if (!error && data) {
      setReminders(
        [...reminders, data].sort((a, b) =>
          a.due_date.localeCompare(b.due_date),
        ),
      );
      setNewReminderText("");
    }
  };

  const handleCompleteReminder = async (id: string) => {
    const { error } = await supabase
      .from("reminders")
      .update({ completed: true })
      .eq("id", id);
    if (!error) setReminders(reminders.filter((r) => r.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-emerald-100 text-sm font-medium">Bem-vindo ao</p>
            <h1 className="text-2xl font-bold">Guardião das Plumas</h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-emerald-700/60 rounded-full hover:bg-emerald-700 transition"
            title="Sair da conta"
          >
            <LogOut className="w-5 h-5 text-emerald-100" />
          </button>
        </div>

        {/* Card de Resumo do Plantel */}
        <div className="bg-emerald-700/50 border border-emerald-500/40 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-white/10 p-3 rounded-xl mt-1">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">
                Total no Plantel
              </p>
              <p className="text-2xl font-bold leading-tight text-white">
                {loading ? "..." : totalBirds}{" "}
                <span className="text-lg font-medium">aves ativas</span>
              </p>
            </div>
          </div>

          {/* N Linhas Clicáveis por Espécie */}
          {!loading && speciesCounts.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {speciesCounts.map((sp) => (
                <Link
                  key={sp.id}
                  href={`/aves?species_id=${sp.id}`}
                  className="flex items-center justify-between bg-emerald-800/40 hover:bg-emerald-800/60 border border-emerald-600/30 p-3 rounded-xl transition"
                >
                  <span className="font-bold text-emerald-50 tracking-wide text-sm">
                    {sp.count} {pluralize(sp.count, sp.name)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-emerald-300" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Ações Rápidas */}
      <main className="p-4 max-w-lg mx-auto space-y-6 mt-2">
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider px-1 mb-3">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/novo"
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-emerald-300 transition group"
            >
              <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 w-fit group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className="text-sm md:text-base font-bold text-gray-800 block leading-tight">
                Nova Ave
              </span>
            </Link>
            <Link
              href="/contatos"
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-purple-300 transition group"
            >
              <div className="bg-purple-100 p-3 rounded-xl text-purple-600 w-fit group-hover:scale-110 transition-transform">
                <Warehouse className="w-6 h-6" />
              </div>
              <span className="text-sm md:text-base font-bold text-gray-800 block leading-tight">
                Criatórios
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/recintos"
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-blue-300 transition group"
            >
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600 w-fit group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6" />
              </div>
              <span className="text-sm md:text-base font-bold text-gray-800 block leading-tight">
                Recintos
              </span>
            </Link>
            <Link
              href="/contatos"
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-purple-300 transition group"
            >
              <div className="bg-purple-100 p-3 rounded-xl text-purple-600 w-fit group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-sm md:text-base font-bold text-gray-800 block leading-tight">
                Criatórios
              </span>
            </Link>
          </div>
        </div>

        {/* Lembretes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-gray-800">Lembretes & Agenda</h2>
            </div>
            <span className="text-xs font-bold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">
              {reminders.length} pendentes
            </span>
          </div>

          <form onSubmit={handleAddReminder} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Novo lembrete (ex: Vacinar...)"
              value={newReminderText}
              onChange={(e) => setNewReminderText(e.target.value)}
              className="flex-1 text-sm text-gray-900 font-medium border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
            />
            <input
              type="date"
              value={newReminderDate}
              onChange={(e) => setNewReminderDate(e.target.value)}
              className="text-xs text-gray-900 font-medium border border-gray-200 rounded-xl px-2 py-2.5 bg-white outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-sm"
            >
              +
            </button>
          </form>

          <div className="space-y-2 pt-2">
            {reminders.length === 0 ? (
              <p className="text-xs font-bold text-gray-400 text-center py-4">
                Nenhum lembrete pendente.
              </p>
            ) : (
              reminders.map((rem) => (
                <div
                  key={rem.id}
                  className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100"
                >
                  <button
                    onClick={() => handleCompleteReminder(rem.id)}
                    className="text-gray-300 hover:text-emerald-600 transition"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {rem.title}
                    </p>
                    <p className="text-xs text-orange-600 font-bold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {format(parseISO(rem.due_date), "dd 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Atalho para Plantel Global */}
        <div>
          <Link
            href="/aves"
            className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-gray-300 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-3 rounded-xl text-gray-600 group-hover:bg-gray-200 transition">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900">
                  Ver Lista Geral do Plantel
                </h3>
                <p className="text-xs font-bold text-gray-500">
                  Buscar, filtrar e gerenciar todas as aves
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
