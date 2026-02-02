"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GREEN_FLAGS, RED_FLAGS } from "@/lib/flags";

type UpsertMaleProfileInput = {
  display_name: string;
  city: string;
  social_context?: string | null;
  // opcional: você pode mandar alias depois
  platform?: string | null;
  handle?: string | null;
};

function normalizeText(v: string) {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function AvaliarPage() {
  const router = useRouter();

  const [anonimo, setAnonimo] = useState(false);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [contato, setContato] = useState("");
  const [relato, setRelato] = useState("");

  const [comportamento, setComportamento] = useState(0);
  const [segurancaEmocional, setSegurancaEmocional] = useState(0);
  const [respeito, setRespeito] = useState(0);
  const [carater, setCarater] = useState(0);
  const [confianca, setConfianca] = useState(0);

  const [greenFlags, setGreenFlags] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const criterios = useMemo(
    () => [
      { key: "comportamento", label: "Comportamento", value: comportamento, setValue: setComportamento },
      { key: "segurancaEmocional", label: "Segurança emocional", value: segurancaEmocional, setValue: setSegurancaEmocional },
      { key: "respeito", label: "Respeito", value: respeito, setValue: setRespeito },
      { key: "carater", label: "Caráter", value: carater, setValue: setCarater },
      { key: "confianca", label: "Confiança", value: confianca, setValue: setConfianca },
    ],
    [comportamento, segurancaEmocional, respeito, carater, confianca]
  );

  function toggleFlag(flag: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(flag) ? list.filter((f) => f !== flag) : [...list, flag]);
  }

  const possuiTodasAvaliacoes = criterios.every((c) => c.value > 0);

  async function upsertMaleProfile(input: UpsertMaleProfileInput): Promise<string> {
    /**
     * Estratégia segura (sem RPC):
     * 1) tenta achar por normalized_name + normalized_city
     * 2) se não achar, cria
     *
     * OBS: isso exige que você já tenha as colunas:
     * male_profiles.normalized_name e male_profiles.normalized_city (você tem no print)
     */
    const normalized_name = normalizeText(input.display_name);
    const normalized_city = normalizeText(input.city);

    const { data: existing, error: findError } = await supabase
      .from("male_profiles")
      .select("id")
      .eq("normalized_name", normalized_name)
      .eq("normalized_city", normalized_city)
      .maybeSingle();

    if (findError) {
      // não derruba a UI
      console.error("find male_profile error:", findError);
    }

    if (existing?.id) return existing.id;

    const { data: created, error: createError } = await supabase
      .from("male_profiles")
      .insert({
        display_name: input.display_name,
        city: input.city,
        social_context: input.social_context ?? null,
        normalized_name,
        normalized_city,
        is_active: true,
      })
      .select("id")
      .single();

    if (createError || !created?.id) {
      throw new Error(createError?.message || "Falha ao criar perfil masculino.");
    }

    // opcional: gravar alias, se você tiver isso no form futuramente
    if (input.platform && input.handle) {
      const normalized_handle = normalizeText(input.handle);
      const { error: aliasError } = await supabase.from("male_profile_aliases").insert({
        male_profile_id: created.id,
        platform: input.platform,
        handle: input.handle,
        normalized_handle,
      });

      if (aliasError) {
        // não impede o fluxo; só loga
        console.warn("alias insert error:", aliasError.message);
      }
    }

    return created.id;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Você precisa estar autenticada para publicar uma avaliação.");
        return;
      }

      if (!cidade || !possuiTodasAvaliacoes) {
        alert("Cidade e avaliações por critério são obrigatórias.");
        return;
      }

      if (!anonimo && !nome.trim()) {
        alert("Nome é obrigatório quando não for anônimo.");
        return;
      }

      // 1) cria/acha o perfil do homem
      const profileId = await upsertMaleProfile({
        display_name: anonimo ? "Não informado" : nome.trim(),
        city: cidade.trim(),
        social_context: null, // se você tiver esse campo no form, pluga aqui
      });

      // 2) monta payload da avaliação (inclui male_profile_id)
      // ATENÇÃO: só inclua campos que EXISTEM na tabela `avaliacoes`.
      const payload: any = {
        autor_id: user.id,
        anonimo,
        nome: anonimo ? null : nome.trim(),
        cidade: cidade.trim(),
        contato: contato?.trim() || null,
        relato: relato?.trim() || null,

        comportamento,
        seguranca_emocional: segurancaEmocional,
        respeito,
        carater,
        confianca,

        male_profile_id: profileId,
      };

      // Se você NÃO tem colunas pra flags, não insira aqui.
      // Em vez disso, você pode concatenar no relato como fallback:
      const flagsText =
        [
          greenFlags.length ? `Green: ${greenFlags.join(", ")}` : null,
          redFlags.length ? `Red: ${redFlags.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" | ") || null;

      if (flagsText) {
        payload.relato = payload.relato ? `${payload.relato}\n\n${flagsText}` : flagsText;
      }

      // 3) salva avaliação
      const { error: insertError } = await supabase.from("avaliacoes").insert(payload);

      if (insertError) {
        alert(insertError.message);
        return;
      }

      // 4) sucesso: limpa e redireciona pro perfil criado
      alert("Avaliação publicada com sucesso!");

      setNome("");
      setCidade("");
      setContato("");
      setRelato("");
      setGreenFlags([]);
      setRedFlags([]);
      setComportamento(0);
      setSegurancaEmocional(0);
      setRespeito(0);
      setCarater(0);
      setConfianca(0);
      setAnonimo(false);

      router.push(`/profile/${profileId}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erro inesperado ao publicar. Veja o console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">Fazer avaliação</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!anonimo && (
          <input
            name="nome"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-zinc-900 p-3 rounded"
          />
        )}

        <input
          name="cidade"
          placeholder="Cidade"
          required
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded"
        />

        <input
          name="contato"
          placeholder="Contato (opcional)"
          value={contato}
          onChange={(e) => setContato(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded"
        />

        {/* ESTRELAS POR CRITÉRIO */}
        <div>
          <p className="mb-2">Avaliação por critério</p>
          <div className="space-y-3">
            {criterios.map((criterio) => (
              <div key={criterio.key}>
                <p className="text-sm text-zinc-300 mb-1">{criterio.label}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => criterio.setValue(n)}
                      className={`text-2xl ${criterio.value >= n ? "text-yellow-400" : "text-zinc-600"}`}
                      aria-label={`${criterio.label} nota ${n}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GREEN FLAGS */}
        <div>
          <p className="mb-2 text-green-400">Green Flags</p>
          <div className="flex flex-wrap gap-2">
            {GREEN_FLAGS.map((flag) => (
              <button
                type="button"
                key={flag.slug}
                onClick={() => toggleFlag(flag.slug, greenFlags, setGreenFlags)}
                className={`px-3 py-1 rounded text-sm ${
                  greenFlags.includes(flag.slug) ? "bg-green-500 text-black" : "bg-zinc-800"
                }`}
              >
                {flag.label}
              </button>
            ))}
          </div>
        </div>

        {/* RED FLAGS */}
        <div>
          <p className="mb-2 text-red-400">Red Flags</p>
          <div className="flex flex-wrap gap-2">
            {RED_FLAGS.map((flag) => (
              <button
                type="button"
                key={flag.slug}
                onClick={() => toggleFlag(flag.slug, redFlags, setRedFlags)}
                className={`px-3 py-1 rounded text-sm ${
                  redFlags.includes(flag.slug) ? "bg-red-500 text-black" : "bg-zinc-800"
                }`}
              >
                {flag.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          name="relato"
          placeholder="Relato (opcional)"
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded min-h-[120px]"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={anonimo}
            onChange={(e) => {
              const checked = e.target.checked;
              setAnonimo(checked);
              if (checked) setNome("");
            }}
          />
          Avaliar de forma anônima
        </label>

        <button
          disabled={loading || !possuiTodasAvaliacoes || (!anonimo && !nome.trim()) || !cidade.trim()}
          className="w-full bg-yellow-500 text-black py-3 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Publicando..." : "Publicar avaliação"}
        </button>
      </form>
    </main>
  );
}
