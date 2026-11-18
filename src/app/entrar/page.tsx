import { LoginForm } from './LoginForm';
import s from './entrar.module.css';

export const metadata = { title: 'Entrar · Banho e Tosa' };

export default function EntrarPage() {
  return (
    <main className={s.page}>
      <section className={s.card} aria-labelledby="titulo">
        <span className={s.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" />
            <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
          </svg>
        </span>
        <h1 id="titulo" className={s.title}>Banho e Tosa</h1>
        <p className={s.sub}>Entre com a sua conta da loja</p>
        <LoginForm />
      </section>
    </main>
  );
}
