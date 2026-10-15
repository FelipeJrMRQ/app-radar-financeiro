import { Directive, ElementRef, forwardRef, HostListener, inject, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Apenas máscara de entrada, sem operações monetárias em ponto flutuante.
 *
 * A digitação ocorre por centavos: 9000 -> R$ 90,00; 105035 -> R$ 1.050,35.
 * O FormControl guarda a representação pt-BR e a API recebe decimal textual.
 * Valores anteriores com 3–4 decimais, aceitos pela API, são preservados ao carregar.
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

/**
 * Converte as teclas numéricas diretamente em centavos, sem Number/parseFloat.
 * Ex.: 1 -> 0,01; 9000 -> 90,00; 105035 -> 1.050,35.
 * null indica estouro de 15 dígitos inteiros; o componente mantém o último valor válido.
 */
export function formatarCentavosDigitados(entrada: string, permiteNegativo = false): string | null {
  const negativo = permiteNegativo && entrada.replace(/^\s*R\$\s*/i, '').trimStart().startsWith('-');
  const digitos = entrada.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digitos) return negativo ? '-' : '';
  const inteira = (digitos.slice(0, -2) || '0').replace(/^0+(?=\d)/, '');
  if (inteira.length > 15) return null;
  const centavos = digitos.slice(-2).padStart(2, '0');
  return (negativo ? '-' : '') + inteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + centavos;
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
    this.valor = finalizarMoedaEmEdicao(
      formatarMoedaEmEdicao(String(valor ?? ''), this.rfMoedaBrPermiteNegativo));
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
    // Digitação sempre no fim: o usuário altera algarismos, nunca o separador.
    const final = this.elemento.value.length;
    this.elemento.setSelectionRange(final, final);
  }

  @HostListener('keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    // Permite apagar até o último centavo sem prender o campo em R$ 0,00.
    if (evento.key === 'Backspace' && (this.valor === '0,00' || this.valor === '-0,00')
        && this.elemento.selectionStart === this.elemento.selectionEnd
        && this.elemento.selectionEnd === this.elemento.value.length) {
      evento.preventDefault();
      this.valor = '';
      this.exibir();
      this.mudou('');
    }
  }

  @HostListener('input')
  aoDigitar(): void {
    const entrada = this.elemento.value;
    // Registros históricos com até quatro decimais são preservados ao carregar
    // e quando editados nesse formato. Para substituí-los, selecione tudo e digite
    // os novos algarismos em centavos.
    const precisaoAnterior = /,\d{3,4}$/.test(this.valor);
    const edicaoLegada = precisaoAnterior && /^\s*R\$\s*-?[\d.]+,\d+\s*$/.test(entrada);
    const proximo = edicaoLegada
      ? formatarMoedaEmEdicao(entrada, this.rfMoedaBrPermiteNegativo)
      : formatarCentavosDigitados(entrada, this.rfMoedaBrPermiteNegativo);

    if (proximo !== null) {
      this.valor = proximo;
      this.mudou(this.valor);
    }
    this.exibir();
    // Teclado de centavos: a inserção e o Backspace atuam sempre no final.
    // Evita que o usuário altere acidentalmente pontos e vírgula da máscara.
    const final = this.elemento.value.length;
    this.elemento.setSelectionRange(final, final);
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

}
