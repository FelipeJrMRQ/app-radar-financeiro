import { Component, ElementRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { mensagemDeErro } from '../../../../core/http/api-error';
import {
  CodigoComponentePainel, moverComponente,
  PreferenciaComponentePainel, TITULOS_COMPONENTES,
} from '../../models/painel-preferencias.model';
import { PainelPreferenciasService } from '../../services/painel-preferencias.service';

@Component({
  selector: 'app-personalizar-painel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './personalizar-painel.page.html',
  styleUrl: './personalizar-painel.page.scss',
})
export class PersonalizarPainelPage implements OnInit {
  private readonly service = inject(PainelPreferenciasService);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;
  readonly carregando = this.service.carregando;
  readonly erroCarregamento = this.service.erro;
  readonly salvando = signal(false);
  readonly erroSalvar = signal<string | null>(null);
  readonly mensagem = signal<string | null>(null);
  readonly alterado = signal(false);
  readonly itens = signal<PreferenciaComponentePainel[]>([]);
  readonly alvo = signal<number | null>(null);
  readonly arrastando = signal<number | null>(null);
  readonly titulo = TITULOS_COMPONENTES;

  private identificadorPonteiro: number | null = null;

  ngOnInit(): void { void this.carregar(); }

  async carregar(): Promise<void> {
    await this.service.carregar();
    this.itens.set(this.service.preferencias().map(x => ({...x})));
    this.alterado.set(false);
  }

  alternar(codigo: CodigoComponentePainel, event: Event): void {
    const visivel = (event.target as HTMLInputElement).checked;
    this.itens.update(itens => itens.map(item =>
      item.codigoComponente === codigo ? {...item, visivel} : item));
    this.marcarAlterado();
  }

  subir(indice: number): void { this.reordenar(indice, indice - 1); }
  descer(indice: number): void { this.reordenar(indice, indice + 1); }

  private reordenar(de: number, para: number): void {
    if (this.salvando() || de === para || para < 0 || para >= this.itens().length) return;
    this.itens.set(moverComponente(this.itens(), de, para));
    this.marcarAlterado();
  }

  iniciarArraste(event: PointerEvent, indice: number): void {
    if (this.salvando() || this.carregando() || this.erroCarregamento()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.identificadorPonteiro = event.pointerId;
    this.arrastando.set(indice);
    this.alvo.set(indice);
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  moverArraste(event: PointerEvent): void {
    if (this.identificadorPonteiro !== event.pointerId || this.arrastando() === null) return;
    const linhas = this.host.nativeElement.querySelectorAll<HTMLElement>('[data-card-row]');
    for (let i = 0; i < linhas.length; i++) {
      const rect = linhas[i].getBoundingClientRect();
      if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
        this.alvo.set(i);
        break;
      }
    }
  }

  finalizarArraste(event: PointerEvent): void {
    if (this.identificadorPonteiro !== event.pointerId) return;
    const origem = this.arrastando();
    const destino = this.alvo();
    this.identificadorPonteiro = null;
    this.arrastando.set(null);
    this.alvo.set(null);
    if (origem !== null && destino !== null) this.reordenar(origem, destino);
  }

  cancelarArraste(): void {
    this.identificadorPonteiro = null;
    this.arrastando.set(null);
    this.alvo.set(null);
  }

  private marcarAlterado(): void {
    this.alterado.set(true);
    this.mensagem.set(null);
    this.erroSalvar.set(null);
  }

  async salvar(): Promise<void> {
    if (this.salvando() || this.carregando() || this.erroCarregamento()) return;
    this.salvando.set(true);
    this.erroSalvar.set(null);
    this.mensagem.set(null);
    try {
      await this.service.salvar(this.itens());
      this.itens.set(this.service.preferencias().map(x => ({...x})));
      this.alterado.set(false);
      this.mensagem.set('Organização e visibilidade salvas na sua conta.');
    } catch (erro) {
      this.erroSalvar.set(mensagemDeErro(erro));
    } finally {
      this.salvando.set(false);
    }
  }

  async restaurar(): Promise<void> {
    if (this.salvando() || this.carregando() || this.erroCarregamento()) return;
    this.salvando.set(true);
    this.erroSalvar.set(null);
    this.mensagem.set(null);
    try {
      await this.service.restaurar();
      this.itens.set(this.service.preferencias().map(x => ({...x})));
      this.alterado.set(false);
      this.mensagem.set('Organização padrão restaurada e salva.');
    } catch (erro) {
      this.erroSalvar.set(mensagemDeErro(erro));
    } finally {
      this.salvando.set(false);
    }
  }
}
