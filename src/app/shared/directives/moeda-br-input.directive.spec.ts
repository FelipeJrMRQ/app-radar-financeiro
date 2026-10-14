import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  finalizarMoedaEmEdicao, formatarMoedaEmEdicao, MoedaBrInputDirective,
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

  it('formata milhar enquanto digita e completa os centavos no blur', () => {
    campo.dispatchEvent(new Event('focus'));
    digitar('1250,5');
    expect(campo.value).toBe('R$ 1.250,5');
    expect(fixture.componentInstance.controle.value).toBe('1.250,5');
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('R$ 1.250,50');
    expect(fixture.componentInstance.controle.value).toBe('1.250,50');
  });

  it('preserva até 4 casas decimais sem arredondar ou usar Number', () => {
    campo.dispatchEvent(new Event('focus'));
    digitar('0,0050');
    expect(campo.value).toBe('R$ 0,0050');
    campo.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.controle.value).toBe('0,0050');
    expect(formatarMoedaEmEdicao('0,00500')).toBe('0,0050');
    expect(formatarMoedaEmEdicao('R$ 1234567,89')).toBe('1.234.567,89');
  });

  it('aceita negativo somente quando permitido, inclusive via escrita programática', () => {
    fixture.componentInstance.permiteNegativo = true;
    fixture.detectChanges();
    fixture.componentInstance.controle.setValue('-1.250,50');
    expect(campo.value).toBe('R$ -1.250,50');
    digitar('-200,25');
    expect(fixture.componentInstance.controle.value).toBe('-200,25');
    expect(formatarMoedaEmEdicao('-200,25')).toBe('200,25');
    expect(finalizarMoedaEmEdicao('10,2')).toBe('10,20');
  });

  it('limpa completamente o campo se o usuário apagar o conteúdo', () => {
    campo.dispatchEvent(new Event('focus'));
    digitar('150');
    digitar('');
    expect(campo.value).toBe('R$ ');
    expect(fixture.componentInstance.controle.value).toBe('');
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('');
  });
});
