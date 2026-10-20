import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { AppShell } from './app-shell';
import { PrivacidadeValoresService } from '../core/privacidade/privacidade-valores.service';

@Component({ standalone: true, template: '' })
class PaginaVazia {}

describe('Ação flutuante de lançamento no layout responsivo', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([
          { path: 'lancamentos/novo', component: PaginaVazia },
          { path: 'entrar', component: PaginaVazia },
        ]),
        { provide: AuthService, useValue: {
          usuario: signal({ nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' }),
          sair: () => {},
        }},
      ],
    }).compileComponents();
  });

  it('inicia valores ocultos e alterna pelo olho em desktop e celular', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const privacidade = TestBed.inject(PrivacidadeValoresService);
    expect(privacidade.valoresVisiveis()).toBeFalse();
    const botoes = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.toggle-privacidade',
    );
    expect(botoes.length).toBe(2);
    expect(botoes[0].getAttribute('aria-label')).toBe('Mostrar valores financeiros');
    botoes[0].click();
    fixture.detectChanges();
    expect(privacidade.valoresVisiveis()).toBeTrue();
    expect(botoes[1].getAttribute('aria-label')).toBe('Ocultar valores financeiros');
    fixture.componentInstance.sair();
    expect(privacidade.valoresVisiveis()).toBeFalse();
  });

  it('renderiza ícones Font Awesome nos menus desktop e mobile', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const conferir = (seletor: string, icone: string) => {
      const svg = raiz.querySelector(`${seletor} fa-icon svg`);
      expect(svg).withContext(seletor).not.toBeNull();
      expect(svg?.getAttribute('data-icon')).withContext(seletor).toBe(icone);
    };

    conferir('.sidebar-link[href="/"]', 'table-cells-large');
    conferir('.sidebar-link[href="/lancamentos"]', 'list-ul');
    conferir('.sidebar-group:first-of-type .sidebar-group-trigger', 'folder-open');
    conferir('.sidebar-group:nth-of-type(2) .sidebar-group-trigger', 'gear');
    conferir('.mobile-bottom-nav a[href="/"]', 'table-cells-large');
    conferir('.mobile-bottom-nav a[href="/lancamentos"]', 'list-ul');
    conferir('.mobile-bottom-nav a[href="/cadastros"]', 'folder-open');
    conferir('.mobile-bottom-nav a[href="/configuracoes"]', 'gear');
    conferir('a.lancamento-fab', 'plus');
    expect(raiz.querySelectorAll('.sidebar-group-trigger fa-icon.group-chevron').length)
      .toBe(2);
    expect(raiz.querySelector('.side-logout fa-icon svg')?.getAttribute('data-icon'))
      .toBe('arrow-right-from-bracket');
    expect(raiz.querySelectorAll('.mobile-bottom-nav a').length).toBe(4);
  });

  it('mantém consulta na navegação e usa o botão flutuante para criar', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const fab = root.querySelector<HTMLAnchorElement>('a.lancamento-fab');
    expect(fab).not.toBeNull();
    expect(fab?.getAttribute('href')).toBe('/lancamentos/novo');
    expect(fab?.getAttribute('aria-label')).toBe('Novo lançamento');
    expect(fab?.querySelector('.lancamento-fab-texto')?.textContent).toBe('Novo lançamento');
    expect(root.querySelectorAll('a.lancamento-fab')).toHaveSize(1);
    expect(root.querySelectorAll('.mobile-bottom-nav a').length).toBe(4);
    expect(root.querySelector('.mobile-bottom-nav a[href="/lancamentos"]')).not.toBeNull();
  });

  it('reserva espaço para o feedback quando o botão flutuante está disponível', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const feedback = fixture.componentInstance.feedbackOperacoes;
    feedback.mostrar('Lançamento confirmado');
    fixture.detectChanges();

    const aviso = (fixture.nativeElement as HTMLElement).querySelector('.feedback-lancamento');
    expect(aviso?.classList.contains('tem-acao-flutuante')).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('a.lancamento-fab'))
      .not.toBeNull();
    feedback.limpar();
    fixture.destroy();
  });

  it('remove a ação redundante na própria tela de novo lançamento', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await router.navigateByUrl('/lancamentos/novo');
    fixture.detectChanges();
    expect(fixture.componentInstance.cadastroLancamentoAtivo()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('.lancamento-fab')).toBeNull();

    fixture.componentInstance.feedbackOperacoes.mostrar('Lançamento salvo');
    fixture.detectChanges();
    const aviso = (fixture.nativeElement as HTMLElement).querySelector('.feedback-lancamento');
    expect(aviso?.classList.contains('tem-acao-flutuante')).toBeFalse();
    fixture.componentInstance.feedbackOperacoes.limpar();
  });
});
