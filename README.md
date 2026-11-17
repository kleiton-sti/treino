# Treino

App pessoal, mobile-first e instalável (PWA), para treino, alimentação, rotina e acompanhamento corporal. Funciona **offline** e guarda tudo **no próprio aparelho**.

- Stack: Vite + React + TypeScript + Tailwind + Dexie (IndexedDB) + Recharts + vite-plugin-pwa
- Sem backend, sem analytics, sem chamadas a serviços externos
- Plano completo em [PROMPT.md](PROMPT.md)

---

## Rodar localmente

Pré-requisito: Node.js 20 ou mais novo.

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # testes da lógica (TMB, metas, Navy %G, Epley, progressão, médias, agenda)
npm run build      # checagem de tipos + build de produção (pasta dist/)
npm run preview    # serve o build localmente
```

Ícones: já vêm gerados em `public/icons/`. Para regenerar: `npm run icons`.

---

## Publicar no GitHub Pages (passo a passo)

1. **Crie o repositório** no GitHub (pode ser público; o app não guarda dados pessoais no código).
2. **Envie o código** para a branch `main`:
   ```bash
   git init
   git add .
   git commit -m "Primeira versão do Treino"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```
3. **Ative o Pages**: no repositório, vá em **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.
4. O workflow `.github/workflows/deploy.yml` roda sozinho a cada push na `main`: testa, faz o build com `base` igual ao nome do repositório e publica.
5. O endereço será `https://SEU-USUARIO.github.io/SEU-REPO/`.

> Se o nome do repositório for diferente de `treino`, nada precisa ser alterado: o workflow define o `base` automaticamente a partir do nome do repo.

---

## Instalar no iPhone

1. Abra o link do app no **Safari**.
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**.
3. Abra pelo ícone. Depois da primeira abertura, o app funciona **offline** (na academia, sem sinal).
4. Na primeira vez, preencha o onboarding (idade, sexo, altura, peso, dias de treino).

**Importante (iOS):** o Safari pode apagar dados de sites pouco usados. O app pede armazenamento persistente e mostra um lembrete de backup a cada 2 semanas. Faça o backup em **Ajustes → Exportar backup (JSON)** e guarde o arquivo.

---

## Onde ficam os dados

| O quê | Onde |
|---|---|
| Perfil, sessões, registros de peso, medidas, sono, dia a dia, corridas, fotos | IndexedDB do navegador (Dexie), só no aparelho |
| Preferências pequenas (tema, data do último backup) | `localStorage` |
| Conteúdo do plano (treinos, exercícios, refeições, corrida) | Arquivos em `src/data/` |

Nenhum dado pessoal vai para o código ou para o repositório. Backups e fotos exportadas estão no `.gitignore`.

---

## Ajustar o plano

- **Treinos e exercícios:** `src/data/workouts.ts` (séries e faixas) e `src/data/exercises.ts` (dicas e substitutos).
- **Horários, proteína dos itens e atalhos de proteína:** `src/data/meals.ts`, e a linha do tempo em `src/lib/schedule.ts`.
- **Corrida:** `src/data/running.ts`.
- Séries e faixas também podem ser editadas no app (aba **Plano**), sem mexer no código.
- Dias de treino, dias de faculdade, horários, perfil e déficit: aba **Ajustes**.

---

## Estrutura

```
src/
  data/        plano (treinos, exercícios, refeições, corrida)
  lib/         cálculos puros e testados (calc, schedule, session, ics, dates, device)
  db/          Dexie (IndexedDB), hooks e backup JSON
  components/  componentes de interface e fotos
  pages/       Hoje, Treino (sessão), Plano, Corpo, Corrida, Ajustes, Onboarding
```

---

## Avisos

Dor articular aguda é motivo para parar. Este app **não substitui** médico ou nutricionista. Os percentuais de gordura são **estimativas** (US Navy e balança de bioimpedância): o que vale é a tendência.
