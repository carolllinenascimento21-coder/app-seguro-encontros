async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setLoading(false);
    alert('Você precisa estar autenticada para publicar uma avaliação.');
    return;
  }

  const possuiTodasAvaliacoes = criterios.every(
    (criterio) => criterio.value > 0
  );

  if (!cidade || !possuiTodasAvaliacoes) {
    setLoading(false);
    alert('Cidade e avaliações por critério são obrigatórias');
    return;
  }

  if (!anonimo && !nome) {
    setLoading(false);
    alert('Nome é obrigatório quando não for anônimo');
    return;
  }

  /**
   * 🔐 PASSO 5 — envio seguro para a API
   * O front NÃO cria avaliação direto no banco
   */
  const response = await fetch('/api/avaliacoes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      autor_id: user.id,
      anonimo,
      display_name: anonimo ? null : nome,
      city: cidade,
      contact: contato,
      relato,
      social_context: 'avaliacao',
      avaliacao: {
        comportamento,
        seguranca_emocional: segurancaEmocional,
        respeito,
        carater,
        confianca,
      },
      green_flags: greenFlags,
      red_flags: redFlags,
    }),
  });

  setLoading(false);

  if (!response.ok) {
    const error = await response.json();
    alert(error?.error || 'Erro ao publicar avaliação');
    return;
  }

  alert('Avaliação publicada com sucesso');

  // reset
  setNome('');
  setCidade('');
  setContato('');
  setRelato('');
  setGreenFlags([]);
  setRedFlags([]);
  setComportamento(0);
  setSegurancaEmocional(0);
  setRespeito(0);
  setCarater(0);
  setConfianca(0);
  setAnonimo(false);
}
