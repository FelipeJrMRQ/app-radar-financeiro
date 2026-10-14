import { Lancamento, modalidadeLancamento, permiteSequencia } from './lancamento.model';

describe('Regras visuais de escopo do lançamento', () => {
  const l = {
    ativo: true, situacao: 'PREVISTO', dataLancamento: '2026-10-20',
    recorrenciaLancamentoId: 1, parcelamentoLancamentoId: null,
  } as Lancamento;

  it('não permite sequência retroativa nem confirmada', () => {
    expect(permiteSequencia(l, '2026-10-14')).toBeTrue();
    expect(permiteSequencia({ ...l, dataLancamento: '2026-10-13' }, '2026-10-14')).toBeFalse();
    expect(permiteSequencia({ ...l, situacao: 'CONFIRMADO' }, '2026-10-14')).toBeFalse();
    expect(permiteSequencia({ ...l, ativo: false }, '2026-10-14')).toBeFalse();
  });

  it('identifica parcelas pelo vínculo real e não pela descrição', () => {
    expect(modalidadeLancamento({ ...l, parcelamentoLancamentoId: 3 })).toBe('PARCELADO');
    expect(modalidadeLancamento({ ...l, recorrenciaLancamentoId: null })).toBe('UNICO');
  });
