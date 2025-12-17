export default function PerfilPage() {
  const profile = {
    name: 'Usuária Confia+',
    email: 'usuario@exemplo.com',
    selfie_verified: true,
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Meu Perfil</h1>

      <div className="space-y-2">
        <p>
          <strong>Nome:</strong> {profile.name}
        </p>
        <p>
          <strong>Email:</strong> {profile.email}
        </p>
        <p>
          <strong>Selfie verificada:</strong> {profile.selfie_verified ? 'Sim' : 'Não'}
        </p>
      </div>
    </div>
  )
}
