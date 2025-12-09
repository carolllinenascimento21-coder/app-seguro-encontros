// Dados mock para demonstração do Confia+

import { PerfilMasculino, Avaliacao, Alerta } from './types';

export const alertasMock: Alerta[] = [
  {
    id: '1',
    tipo: 'manipulacao',
    descricao: 'Comportamento manipulador relatado por múltiplas usuárias',
    gravidade: 'alta'
  },
  {
    id: '2',
    tipo: 'desrespeito',
    descricao: 'Desrespeito em encontros anteriores',
    gravidade: 'media'
  },
  {
    id: '3',
    tipo: 'agressividade',
    descricao: 'Comportamento agressivo em discussões',
    gravidade: 'critica'
  },
  {
    id: '4',
    tipo: 'golpe',
    descricao: 'Tentativa de golpe amoroso identificada',
    gravidade: 'critica'
  }
];

export const avaliacoesMock: Avaliacao[] = [
  {
    id: '1',
    perfilId: '1',
    usuariaId: 'user1',
    data: '2024-01-15',
    comportamento: 2,
    segurancaEmocional: 1,
    respeito: 2,
    carater: 1,
    confianca: 1,
    relato: 'Muito manipulador, mentiu sobre várias coisas. Não recomendo.',
    redFlags: ['Mentiras constantes', 'Manipulação emocional', 'Desrespeito'],
    anonimo: true
  },
  {
    id: '2',
    perfilId: '1',
    usuariaId: 'user2',
    data: '2024-02-20',
    comportamento: 2,
    segurancaEmocional: 2,
    respeito: 1,
    carater: 2,
    confianca: 1,
    relato: 'Comportamento agressivo quando contrariado. Cuidado!',
    redFlags: ['Agressividade', 'Falta de respeito'],
    anonimo: true
  },
  {
    id: '3',
    perfilId: '2',
    usuariaId: 'user3',
    data: '2024-03-10',
    comportamento: 5,
    segurancaEmocional: 5,
    respeito: 5,
    carater: 5,
    confianca: 5,
    relato: 'Pessoa incrível, respeitosa e honesta. Recomendo totalmente!',
    redFlags: [],
    anonimo: false
  },
  {
    id: '4',
    perfilId: '3',
    usuariaId: 'user4',
    data: '2024-02-28',
    comportamento: 4,
    segurancaEmocional: 4,
    respeito: 4,
    carater: 4,
    confianca: 4,
    relato: 'Bom caráter, mas um pouco imaturo emocionalmente.',
    redFlags: ['Imaturidade emocional'],
    anonimo: true
  }
];

export const perfisMock: PerfilMasculino[] = [
  {
    id: '1',
    nome: 'Carlos Silva',
    telefone: '(11) 98765-4321',
    idade: 35,
    cidade: 'São Paulo, SP',
    nivelReputacao: 'perigo',
    notaGeral: 1.5,
    totalAvaliacoes: 8,
    porcentagemConfiabilidade: 15,
    alertas: [alertasMock[0], alertasMock[2]],
    avaliacoes: [avaliacoesMock[0], avaliacoesMock[1]],
    ultimaAtualizacao: '2024-02-20'
  },
  {
    id: '2',
    nome: 'João Santos',
    telefone: '(21) 99876-5432',
    idade: 28,
    cidade: 'Rio de Janeiro, RJ',
    nivelReputacao: 'excelente',
    notaGeral: 4.8,
    totalAvaliacoes: 12,
    porcentagemConfiabilidade: 96,
    alertas: [],
    avaliacoes: [avaliacoesMock[2]],
    ultimaAtualizacao: '2024-03-10'
  },
  {
    id: '3',
    nome: 'Pedro Oliveira',
    telefone: '(31) 97654-3210',
    idade: 32,
    cidade: 'Belo Horizonte, MG',
    nivelReputacao: 'confiavel',
    notaGeral: 4.0,
    totalAvaliacoes: 5,
    porcentagemConfiabilidade: 80,
    alertas: [],
    avaliacoes: [avaliacoesMock[3]],
    ultimaAtualizacao: '2024-02-28'
  },
  {
    id: '4',
    nome: 'Ricardo Mendes',
    telefone: '(85) 96543-2109',
    idade: 40,
    cidade: 'Fortaleza, CE',
    nivelReputacao: 'atencao',
    notaGeral: 2.8,
    totalAvaliacoes: 6,
    porcentagemConfiabilidade: 45,
    alertas: [alertasMock[1]],
    avaliacoes: [],
    ultimaAtualizacao: '2024-01-30'
  },
  {
    id: '5',
    nome: 'Lucas Ferreira',
    telefone: '(41) 95432-1098',
    idade: 29,
    cidade: 'Curitiba, PR',
    nivelReputacao: 'confiavel',
    notaGeral: 4.2,
    totalAvaliacoes: 9,
    porcentagemConfiabilidade: 84,
    alertas: [],
    avaliacoes: [],
    ultimaAtualizacao: '2024-03-05'
  }
];
