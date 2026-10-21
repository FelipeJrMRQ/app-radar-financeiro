import { TotalCategoria } from '../models/painel-financeiro.model';

/** Apenas apresentação: os valores por categoria já foram calculados na API com BigDecimal. */
export interface FatiaDespesasRosca {
  chave: string;
  nome: string;
  valor: string;
  valorFormatado: string;
  percentual: number;
  percentualFormatado: string;
  cor: string;
  quantidadeAgrupada: number;
}

export interface DadosDespesasRosca {
  total: string;
  totalFormatado: string;
  fatias: FatiaDespesasRosca[];
}

const ESCALA = 10_000n;
const CORES = ['#118C79', '#4E88D4', '#D6A047', '#9575C5', '#D66C79', '#8C9FAA'];
const formatoInteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const formatoPercentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1, maximumFractionDigits: 1,
});

/** Valor exato de quatro casas decimais, sem soma monetária em ponto flutuante. */
function unidadesDecimal(valor: number | string): bigint | null {
  if (typeof valor === 'number' && !Number.isFinite(valor)) return null;
  const texto = String(valor).trim();
  const partes = /^(\d+)(?:\.(\d{1,4}))?$/.exec(texto);
  if (!partes) return null;
  return BigInt(partes[1]) * ESCALA + BigInt((partes[2] ?? '').padEnd(4, '0'));
}

function decimalTexto(valor: bigint): string {
  return String(valor / ESCALA) + '.' + String(valor % ESCALA).padStart(4, '0');
}

/** A legenda e o centro exibem centavos arredondados, sem perder a soma de 4 casas. */
function moedaExata(valor: bigint): string {
  const centavos = (valor + 50n) / 100n;
  const inteiro = centavos / 100n;
  const centesimos = String(centavos % 100n).padStart(2, '0');
  return 'R$\u00a0' + formatoInteiro.format(inteiro) + ',' + centesimos;
}

export function prepararDespesasRosca(categorias: TotalCategoria[]): DadosDespesasRosca {
  const ordenadas = categorias.flatMap(categoria => {
    const valor = unidadesDecimal(categoria.valor);
    return valor !== null && valor > 0n
      ? [{ id: categoria.categoriaId, nome: categoria.categoriaNome, valor }]
      : [];
  }).sort((a, b) => {
    if (a.valor !== b.valor) return a.valor > b.valor ? -1 : 1;
    return a.nome.localeCompare(b.nome, 'pt-BR') || a.id - b.id;
  });

  const total = ordenadas.reduce((acumulado, categoria) => acumulado + categoria.valor, 0n);
  if (total === 0n) return { total: '0.0000', totalFormatado: moedaExata(0n), fatias: [] };

  const principais = ordenadas.slice(0, 5).map(categoria => ({
    chave: 'categoria-' + categoria.id,
    nome: categoria.nome,
    valor: categoria.valor,
    quantidadeAgrupada: 1,
  }));
  if (ordenadas.length > 5) {
    principais.push({
      chave: 'outras',
      nome: 'Outras',
      valor: ordenadas.slice(5).reduce((soma, categoria) => soma + categoria.valor, 0n),
      quantidadeAgrupada: ordenadas.length - 5,
    });
  }

  return {
    total: decimalTexto(total),
    totalFormatado: moedaExata(total),
    fatias: principais.map((categoria, indice) => {
      const percentual = Number((categoria.valor * 1000n + total / 2n) / total) / 10;
      return {
        chave: categoria.chave,
        nome: categoria.nome,
        valor: decimalTexto(categoria.valor),
        valorFormatado: moedaExata(categoria.valor),
        percentual,
        percentualFormatado: formatoPercentual.format(percentual) + '%',
        cor: CORES[indice],
        quantidadeAgrupada: categoria.quantidadeAgrupada,
      };
    }),
  };
}
