export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
          Confia+
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300">
          App carregado com sucesso.
        </p>
        <div className="mt-8 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors">
          Sistema Online ✓
        </div>
      </div>
    </div>
  );
}
