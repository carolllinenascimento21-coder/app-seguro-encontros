// Tipos do Confia+

export type NivelReputacao = 'excelente' | 'confiavel' | 'atencao' | 'perigo';

export interface Alerta {
  id: string;
  tipo: 'agressividade' | 'desrespeito' | 'manipulacao' | 'traicao' | 'golpe' | 'stalking' | 'abuso';
  descricao: string;
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
}

export interface Avaliacao {
  id: string;
  perfilId: string;
  usuariaId: string;
  data: string;
  comportamento: number; // 1-5
  segurancaEmocional: number; // 1-5
  respeito: number; // 1-5
  carater: number; // 1-5
  confianca: number; // 1-5
  relato?: string;
  redFlags: string[];
  anonimo: boolean;
}

export interface PerfilMasculino {
  id: string;
  nome: string;
  telefone?: string;
  idade?: number;
  cidade?: string;
  foto?: string;
  nivelReputacao: NivelReputacao;
  notaGeral: number; // 0-5
  totalAvaliacoes: number;
  porcentagemConfiabilidade: number; // 0-100
  alertas: Alerta[];
  avaliacoes: Avaliacao[];
  ultimaAtualizacao: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  foto?: string;
  dataCadastro: string;
}

// Tipos para cadastro e verificação
export interface CadastroTemp {
  nome: string;
  email: string;
  senha: string;
  dataCadastro: string;
}

export interface UsuarioPerfil {
  id: string;
  nome: string;
  email: string;
  dataCadastro: string;
  statusSelfie: 'pendente' | 'aprovada' | 'reprovada';
  fotoVerificacao?: string;
}
