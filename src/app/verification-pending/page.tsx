export default function VerificationPendingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-3xl font-bold">Selfie em análise</h1>
        <p className="text-muted-foreground">
          Recebemos a sua selfie e estamos verificando se tudo está de acordo com as
          regras do aplicativo. Enquanto a verificação não é concluída, o acesso às
          áreas protegidas permanecerá bloqueado.
        </p>
        <p className="text-muted-foreground">
          Assim que sua identidade for confirmada, você poderá continuar usando o Confia+
          com segurança.
        </p>
      </div>
    </main>
  )
}
