import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { mensagemDeErro } from '../../core/http/api-error';
import { Categoria, TipoCategoria } from './categoria.model';
import { CategoriasService } from './categorias.service';

type FiltroCategorias = 'TODAS' | TipoCategoria;

@Component({
  selector: 'app-categorias-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './categorias.page.html',
  styleUrl: './categorias.page.scss',
})
export class CategoriasPage implements OnInit {
  private readonly api = inject(CategoriasService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private destruida = false;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroFormulario = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly exibindoFormulario = signal(false);
  readonly filtro = signal<FiltroCategorias>('TODAS');
  readonly categorias = signal<Categoria[]>([]);
  readonly filtradas = computed(() => this.categorias().filter(
    (categoria) => this.filtro() === 'TODAS' || categoria.tipo === this.filtro(),
  ));
  readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    tipo: this.fb.control<TipoCategoria>('DESPESA', Validators.required),
  });

  constructor() {
    this.destroyRef.onDestroy(() => { this.destruida = true; });
  }

  ngOnInit(): void { void this.carregar(); }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const categorias = await firstValueFrom(this.api.listar());
      if (!this.destruida) this.categorias.set(categorias);
    } catch (erro) {
      if (!this.destruida) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruida) this.carregando.set(false);
    }
  }

  abrirFormulario(): void {
    this.sucesso.set(null);
    this.erroFormulario.set(null);
    this.exibindoFormulario.set(true);
  }

  cancelar(): void {
    this.exibindoFormulario.set(false);
    this.erroFormulario.set(null);
    this.form.reset({ nome: '', tipo: 'DESPESA' });
  }

  async salvar(): Promise<void> {
    if (this.salvando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.form.controls.nome.value.trim()) return;
    this.salvando.set(true);
    this.erroFormulario.set(null);
    try {
      await firstValueFrom(this.api.criar({
        nome: this.form.controls.nome.value.trim(),
        tipo: this.form.controls.tipo.value,
      }));
      if (this.destruida) return;
      this.cancelar();
      this.sucesso.set('Categoria criada com sucesso.');
      await this.carregar();
    } catch (erro) {
      if (!this.destruida) this.erroFormulario.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruida) this.salvando.set(false);
    }
  }
}
