import { Directive, ElementRef, forwardRef, HostListener, inject, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Apenas máscara de entrada, sem operações monetárias em ponto flutuante.
 *
 * O FormControl recebe, por exemplo, "1.250,50", enquanto o input apresenta
 * "R$ 1.250,50". A validação de DECIMAL(19,4) permanece no formulário/backend.
 */
export function formatarMoedaEmEdicao(entrada: string, permiteNegativo = false): string {
  const semSimbolo = entrada.replace(/^\s*R\$\s*/i, '').trim();
  const negativo = permiteNegativo && semSimbolo.startsWith('-');
  const somenteNumeros = semSimbolo.replace(/[^\d,]/g, '');
  const indiceVirgula = somenteNumeros.indexOf(',');
  const temVirgula = indiceVirgula !== -1;
  const inteiroOriginal = temVirgula ? somenteNumeros.slice(0, indiceVirgula) : somenteNumeros;
  const fracao = temVirgula
    ? somenteNumeros.slice(indiceVirgula + 1).replace(/,/g, '').slice(0, 4)
    : '';

  if (!/\d/.test(somenteNumeros) && !temVirgula) {
    return negativo ? '-' : '';
  }

  const inteiro = (inteiroOriginal.replace(/^0+(?=\d)/, '') || '0').slice(0, 15);
  const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (negativo ? '-' : '') + milhar + (temVirgula ? ',' + fracao : '');
}

/** Completa os centavos quando o usuário termina de editar o campo. */
export function finalizarMoedaEmEdicao(valor: string): string {
  if (!valor || valor === '-') return '';
  const posicaoVirgula = valor.indexOf(',');
  if (posicaoVirgula === -1) return valor + ',00';
  const fracao = valor.slice(posicaoVirgula + 1);
  return valor.slice(0, posicaoVirgula + 1) + fracao.padEnd(2, '0');
}

@Directive({
  selector: 'input[rfMoedaBr]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MoedaBrInputDirective),
    multi: true,
  }],
})
export class MoedaBrInputDirective implements ControlValueAccessor {
  private readonly elemento = inject(ElementRef<HTMLInputElement>).nativeElement;
  private readonly placeholderOriginal = this.elemento.getAttribute('placeholder') ?? '';
  private valor = '';
  private focado = false;
  private mudou: (valor: string) => void = () => {};
  private tocou: () => void = () => {};

  @Input() rfMoedaBrPermiteNegativo = false;

  writeValue(valor: string | null | undefined): void {
    this.valor = formatarMoedaEmEdicao(String(valor ?? ''), this.rfMoedaBrPermiteNegativo);
    this.exibir();
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.mudou = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.tocou = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.elemento.disabled = desabilitado;
  }

  @HostListener('focus')
  aoFocar(): void {
    this.focado = true;
    this.elemento.placeholder = '';
    this.exibir();
    // No campo ainda vazio, o símbolo aparece sem impor um valor ao formulário.
    if (!this.valor) this.elemento.setSelectionRange(this.elemento.value.length, this.elemento.value.length);
  }

  @HostListener('input')
  aoDigitar(): void {
    const entrada = this.elemento.value;
    const indiceCursor = this.elemento.selectionStart ?? entrada.length;
    const caracteresAntes = (entrada.slice(0, indiceCursor).replace(/^\s*R\$\s*/i, '').match(/[\d,-]/g) ?? []).length;

    this.valor = formatarMoedaEmEdicao(entrada, this.rfMoedaBrPermiteNegativo);
    this.exibir();
    this.mudou(this.valor);

    // Preserva o ponto lógico de edição ao inserir separadores de milhar.
    const exibido = this.elemento.value;
    const cursor = this.posicaoPorCaracteres(exibido, caracteresAntes);
    this.elemento.setSelectionRange(cursor, cursor);
  }

  @HostListener('blur')
  aoDesfocar(): void {
    this.focado = false;
    this.elemento.placeholder = this.placeholderOriginal;
    const completo = finalizarMoedaEmEdicao(this.valor);
    if (completo !== this.valor) {
      this.valor = completo;
      this.mudou(this.valor);
    }
    this.exibir();
    this.tocou();
  }

  private exibir(): void {
    this.elemento.value = this.valor || this.focado ? 'R$ ' + this.valor : '';
  }

  private posicaoPorCaracteres(texto: string, quantidade: number): number {
    if (quantidade <= 0) return Math.min(3, texto.length);
    let encontrados = 0;
    for (let i = 3; i < texto.length; i++) {
      if (/[\d,-]/.test(texto[i])) encontrados++;
      if (encontrados === quantidade) return i + 1;
    }
    return texto.length;
  }
}
