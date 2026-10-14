import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { MeuPerfilPage } from './meu-perfil.page';

describe('MeuPerfilPage', () => {
  it('exibe os dados do usuário autenticado sem campos de edição', async () => {
    await TestBed.configureTestingModule({
      imports: [MeuPerfilPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: signal({
          id: 9, nome: 'Usuário Teste', email: 'teste@exemplo.com',
        }) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MeuPerfilPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Usuário Teste');
    expect(root.textContent).toContain('teste@exemplo.com');
    expect(root.querySelector('input')).toBeNull();
  });
});
