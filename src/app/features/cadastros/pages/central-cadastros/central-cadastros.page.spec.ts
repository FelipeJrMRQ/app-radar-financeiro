import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CentralCadastrosPage } from './central-cadastros.page';

describe('CentralCadastrosPage', () => {
  it('oferece apenas as rotas de cadastros implementados', async () => {
    await TestBed.configureTestingModule({
      imports: [CentralCadastrosPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(CentralCadastrosPage);
    fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .map(link => link.getAttribute('href'));
    expect(links).toContain('/contas');
    expect(links).toContain('/categorias');
    expect(links).toContain('/cartoes');
    expect(fixture.nativeElement.textContent).toContain('Cadastre cartões');
  });
});
