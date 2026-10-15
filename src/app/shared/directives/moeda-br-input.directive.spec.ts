import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { decimalPositivo } from '../valor-monetario';

import {
  finalizarMoedaEmEdicao, formatarCentavosDigitados, formatarMoedaEmEdicao, MoedaBrInputDirective,
} from './moeda-br-input.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MoedaBrInputDirective],
  template: `<input type="text" rfMoedaBr placeholder="R$ 0,00"
                     [rfMoedaBrPermiteNegativo]="permiteNegativo" [formControl]="controle">`,
})
class CampoTesteComponent {
  permiteNegativo = false;
  controle = new FormControl('', { nonNullable: true });
}

describe('Máscara brasileira de campos monetários', () => {
  let fixture: ComponentFixture<CampoTesteComponent>;
  let campo: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampoTesteComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CampoTesteComponent);
    fixture.detectChanges();
    campo = fixture.nativeElement.querySelector('input');
  });

  function digitar(valor: string): void {
    campo.value = valor;
    campo.setSelectionRange(valor.length, valor.length);
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('retira o placeholder ao focar e não cria saldo falso', () => {
    expect(campo.placeholder).toBe('R$ 0,00');
    campo.dispatchEvent(new Event('focus'));
    expect(campo.placeholder).toBe('');
    expect(campo.value).toBe('R$ ');
    expect(fixture.componentInstance.controle.value).toBe('');
    campo.dispatchEvent(new Event('blur'));
    expect(campo.placeholder).toBe('R$ 0,00');
    expect(campo.value).toBe('');
  });


  function sequenciaDeTeclas(algorismos: string): void {
    for (const digito of algorismos) {
      digitar(campo.value + digito);
    }
  }

  it('desloca os centavos automaticamente durante a digitação de 9000', () => {
    campo.dispatchEvent(new Event('focus'));
    sequenciaDeTeclas('9000');
    expect(campo.value).toBe('R$ 90,00');
    expect(fixture.componentInstance.controle.value).toBe('90,00');
    expect(campo.selectionStart).toBe(campo.value.length);
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('R$ 90,00');
  });

  it('formata 105035 como R$ 1.050,35 sem digitar a vírgula', () => {
    campo.dispatchEvent(new Event('focus'));
    sequenciaDeTeclas('105035');
    expect(campo.value).toBe('R$ 1.050,35');
    expect(fixture.componentInstance.controle.value).toBe('1.050,35');
    expect(decimalPositivo(fixture.componentInstance.controle.value)).toBe('1050.35');
    expect(formatarCentavosDigitados('105035')).toBe('1.050,35');
    expect(formatarCentavosDigitados('1')).toBe('0,01');
    expect(formatarCentavosDigitados('10')).toBe('0,10');
    expect(formatarCentavosDigitados('100')).toBe('1,00');
    expect(formatarCentavosDigitados('R$ 1.050,35')).toBe('1.050,35');
  });

  it('permite Backspace com deslocamento de centavos e substituição integral', () => {
    campo.dispatchEvent(new Event('focus'));
    sequenciaDeTeclas('105035');
    digitar(campo.value.slice(0, -1));
    expect(campo.value).toBe('R$ 105,03');
    digitar('9000');
    expect(campo.value).toBe('R$ 90,00');
    digitar('');
    expect(campo.value).toBe('R$ ');
    expect(fixture.componentInstance.controle.value).toBe('');
  });

  it('apaga R$ 0,00 com Backspace sem prender o usuário no valor zero', () => {
    campo.dispatchEvent(new Event('focus'));
    sequenciaDeTeclas('0');
    expect(campo.value).toBe('R$ 0,00');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true }));
    expect(campo.value).toBe('R$ ');
    expect(fixture.componentInstance.controle.value).toBe('');
  });

  it('preserva precisão histórica de quatro decimais sem arredondar ao editar', () => {
    fixture.componentInstance.controle.setValue('0,0050');
    expect(campo.value).toBe('R$ 0,0050');
    campo.dispatchEvent(new Event('focus'));
    campo.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.controle.value).toBe('0,0050');
    fixture.componentInstance.controle.setValue('1250,5');
    expect(campo.value).toBe('R$ 1.250,50');
    expect(formatarMoedaEmEdicao('0,00500')).toBe('0,0050');
    expect(formatarMoedaEmEdicao('R$ 1234567,89')).toBe('1.234.567,89');
  });

  it('respeita sinal negativo apenas quando habilitado e sem ponto flutuante', () => {
    fixture.componentInstance.permiteNegativo = true;
    fixture.detectChanges();
    campo.dispatchEvent(new Event('focus'));
    digitar('-20025');
    expect(campo.value).toBe('R$ -200,25');
    expect(fixture.componentInstance.controle.value).toBe('-200,25');
    expect(formatarCentavosDigitados('-20025', true)).toBe('-200,25');
    expect(formatarCentavosDigitados('-20025')).toBe('200,25');
    expect(formatarMoedaEmEdicao('-200,25')).toBe('200,25');
    expect(finalizarMoedaEmEdicao('10,2')).toBe('10,20');
  });

  it('recusa entrada maior que 15 dígitos inteiros sem alterar o valor anterior', () => {
    campo.dispatchEvent(new Event('focus'));
    digitar('12345678901234567');
    expect(campo.value).toBe('R$ 123.456.789.012.345,67');
    expect(formatarCentavosDigitados('123456789012345678')).toBeNull();
    digitar(campo.value + '8');
    expect(campo.value).toBe('R$ 123.456.789.012.345,67');
    expect(fixture.componentInstance.controle.value).toBe('123.456.789.012.345,67');
  });

  it('restaura placeholder depois de apagar o campo', () => {
    campo.dispatchEvent(new Event('focus'));
    sequenciaDeTeclas('150');
    digitar('');
    expect(campo.value).toBe('R$ ');
    expect(fixture.componentInstance.controle.value).toBe('');
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('');
    expect(campo.placeholder).toBe('R$ 0,00');
  });
});
