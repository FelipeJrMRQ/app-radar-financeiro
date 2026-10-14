import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { AppShell } from './app-shell';

@Component({ standalone: true, template: '' })
class PaginaVazia {}

describe('Ação flutuante no layout mobile', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([
          { path: 'lancamentos/novo', component: PaginaVazia },
        ]),
        { provide: AuthService, useValue: {
          usuario: signal({ nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' }),
          sair: () => {},
        }},
      ],
    }).compileComponents();
  });

  it('mantém consulta na navegação e usa o botão flutuante para criar', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const fab = root.querySelector<HTMLAnchorElement>('a.mobile-fab');
    expect(fab).not.toBeNull();
    expect(fab?.getAttribute('href')).toBe('/lancamentos/novo');
    expect(fab?.getAttribute('aria-label')).toBe('Novo lançamento');
    expect(root.querySelectorAll('.mobile-bottom-nav a').length).toBe(4);
    expect(root.querySelector('.mobile-bottom-nav a[href="/lancamentos"]')).not.toBeNull();
  });

  it('remove a ação redundante na própria tela de novo lançamento', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await router.navigateByUrl('/lancamentos/novo');
    fixture.detectChanges();
    expect(fixture.componentInstance.cadastroLancamentoAtivo()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('.mobile-fab')).toBeNull();
  });
});
