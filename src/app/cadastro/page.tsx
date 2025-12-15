diff --git a/src/app/cadastro/page.tsx b/src/app/cadastro/page.tsx
index 0a9d7d5d04c4bb4f05e2bdb72db9e4273b6574a2..3398f51441d028d3b8d80fbab4c0f1b9aff7689d 100644
--- a/src/app/cadastro/page.tsx
+++ b/src/app/cadastro/page.tsx
@@ -1,28 +1,29 @@
 'use client';
 
-import { useState } from 'react';
+import { Camera } from 'lucide-react';
+import { type FormEvent, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import { supabase } from '@/lib/supabase';
 
 export default function CadastroPage() {
   const router = useRouter();
 
   const [formData, setFormData] = useState({
     nome: '',
     email: '',
     senha: '',
   });
 
   const [errors, setErrors] = useState({
     nome: '',
     email: '',
     senha: '',
   });
 
   const [loading, setLoading] = useState(false);
 
   const validateEmail = (email: string) => {
     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
   };
 
   const validateForm = () => {
@@ -32,84 +33,89 @@ export default function CadastroPage() {
       senha: '',
     };
 
     if (!formData.nome.trim()) {
       newErrors.nome = 'Nome completo é obrigatório';
     } else if (formData.nome.trim().split(' ').length < 2) {
       newErrors.nome = 'Digite seu nome completo';
     }
 
     if (!formData.email.trim()) {
       newErrors.email = 'E-mail é obrigatório';
     } else if (!validateEmail(formData.email)) {
       newErrors.email = 'E-mail inválido';
     }
 
     if (!formData.senha) {
       newErrors.senha = 'Senha é obrigatória';
     } else if (formData.senha.length < 6) {
       newErrors.senha = 'Senha deve ter no mínimo 6 caracteres';
     }
 
     setErrors(newErrors);
     return !newErrors.nome && !newErrors.email && !newErrors.senha;
   };
 
-  const handleSubmit = async (e: React.FormEvent) => {
+  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
     e.preventDefault();
 
     if (!validateForm()) return;
 
     setLoading(true);
 
     try {
       const { error } = await supabase.auth.signUp({
         email: formData.email,
         password: formData.senha,
       });
 
       if (error) {
         throw error;
       }
 
       // Profile é criado automaticamente pelo trigger no banco
       router.push('/verificacao-selfie');
     } catch (err: any) {
       console.error(err);
       alert(err.message || 'Erro ao criar conta');
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-black flex items-center justify-center px-4">
       <form
         onSubmit={handleSubmit}
         className="w-full max-w-md space-y-4 bg-black text-white"
       >
-        <h1 className="text-xl font-semibold text-center">Criar conta</h1>
+        <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
+          <Camera aria-hidden className="h-6 w-6" />
+          <h1 className="text-xl font-semibold text-center text-white">
+            Criar conta
+          </h1>
+        </div>
 
         <input
           type="text"
           placeholder="Nome completo"
           value={formData.nome}
           onChange={(e) =>
             setFormData({ ...formData, nome: e.target.value })
           }
           className="w-full border border-gray-700 p-2 rounded bg-black"
         />
         {errors.nome && (
           <p className="text-red-500 text-sm">{errors.nome}</p>
         )}
 
         <input
           type="email"
           placeholder="E-mail"
           value={formData.email}
           onChange={(e) =>
             setFormData({ ...formData, email: e.target.value })
           }
           className="w-full border border-gray-700 p-2 rounded bg-black"
         />
         {errors.email && (
           <p className="text-red-500 text-sm">{errors.email}</p>
