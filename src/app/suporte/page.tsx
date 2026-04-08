export const metadata = {
  title: 'Suporte - Confia+',
  description: 'Suporte oficial do Confia+. Entre em contato para ajuda e suporte técnico.',
}

export default function SuportePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-4">Suporte Confia+</h1>
      <p className="text-center max-w-md mb-6 text-gray-300">
        Se você precisa de ajuda, suporte técnico ou deseja reportar algum problema, nossa equipe está disponível para te
        atender.
      </p>

      <div className="bg-gray-900 border border-yellow-500 rounded-xl p-6 w-full max-w-md text-center">
        <p className="mb-2 text-gray-400">Entre em contato pelo e-mail:</p>
        <a href="mailto:suporte@confiamais.net" className="text-yellow-400 font-semibold text-lg hover:underline">
          suporte@confiamais.net
        </a>
        <p className="mt-4 text-xs text-gray-500">Tempo médio de resposta: até 24 horas úteis</p>
      </div>

      <div className="mt-8 text-xs text-gray-500 text-center max-w-md">
        <p>
          Confia+ é uma plataforma dedicada à segurança digital. Caso identifique qualquer comportamento inadequado, reporte
          imediatamente.
        </p>
      </div>
    </div>
  )
}
