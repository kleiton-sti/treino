# Prompt — App "Treino" (rotina, treino, alimentação e progresso)

> Cole este documento inteiro para a IA que vai construir a aplicação.
> Antes de colar, preencha os campos marcados com `[PREENCHER]` na seção 2.

---

## 1. Missão

Construa uma **aplicação web pessoal, mobile-first, instalável como PWA**, publicada no **GitHub Pages**, que funcione como meu guia diário de **treino, alimentação, rotina e acompanhamento corporal**.

Ela não é um app genérico de academia: é feita para **a minha rotina real** (descrita abaixo). O app deve me dizer, a cada momento do dia, o que fazer agora, registrar o que eu fiz e me mostrar se estou evoluindo.

Idioma da interface: **português do Brasil**. Uso principal: **iPhone (Safari / PWA na tela inicial)**, dentro da academia, com uma mão, muitas vezes com pressa.

---

## 2. Quem sou eu (dados de partida)

| Campo | Valor |
|---|---|
| Idade | `27` |
| Sexo | `Masculino` |
| Altura (cm) | `169` |
| Peso atual (kg) | `72` |
| Nível | Intermediário-iniciante: já treinei, mas **estou 1 mês parado** |
| Equipamentos em casa | Nenhum de bioimpedância. Pretendo comprar **balança digital** e **fita métrica** |

> Esses dados **não devem ficar no código-fonte** (o repositório é público). O app pede tudo isso numa tela de onboarding e guarda só no aparelho.

### Ponto de partida (avaliação visual por fotos, é estimativa e não medição)
- Gordura corporal estimada em **~18–22%**, concentrada no **abdômen inferior e na cintura**.
- Pernas com base razoável; **peitoral, ombros (deltoide lateral), costas e braços com pouca massa muscular**.
- Possível leve **projeção dos ombros para frente e inclinação anterior da pelve** na foto de perfil → priorizar costas (remadas), core e glúteos.
- Perfil clássico para **recomposição corporal**: perder gordura e ganhar músculo ao mesmo tempo, com déficit calórico leve e proteína alta.

### Objetivo estético
"Ficar gostoso": **secar a barriga** e ganhar **braço, peito, ombro e coxa**. As referências são um físico **atlético e definido** (abdômen visível, ~10–12% de gordura, massa moderada) e um físico **mais musculoso de braço/perna/ombro**.
Expectativa realista que o app deve comunicar: a primeira referência leva **~12–18 meses** de consistência; a segunda, **alguns anos**. Mudanças visíveis aparecem em **8–12 semanas**.

---

## 3. Minha rotina real

### Dia útil padrão (terça, quinta, sexta)
| Hora | O que acontece hoje |
|---|---|
| 06:15 | Acordo. Café + 1 bolachinha (pressa para pegar o ônibus) |
| ~08:00 | Chego no trabalho e tomo um **YoPro (15 g ou 23 g de proteína)** |
| Manhã/tarde | Castanhas nos intervalos |
| Almoço | Comida caseira tradicional: **arroz, feijão e o máximo de carne possível** |
| ~16:45 | Maçã antes do treino |
| 17:00 | Saio do trabalho |
| 17:50 | Chego na academia. **Máximo 1 h**, incluindo ~15 min de esteira |
| ~19:00 | Casa, banho |
| ~20:00 | **2 scoops de whey** + **creatina** |
| 20:00–23:00 | Estudo |
| 23:00–00:00 | Deito, leio, durmo por volta de 00:00 |

### Segunda e quarta (faculdade)
Se eu treinar: academia 17:50 → saio correndo → chego na faculdade **~19:30**. O treino tem que caber em **~45–50 min sem desculpa**.

### Fim de semana
Livre. Quero **passar parte do volume de treino para sábado e domingo**, para ter terça/quinta/sexta mais leves (chegar cedo em casa, estudar e dormir mais cedo).
**Corrida na rua** no fim de semana é um **complemento opcional** que eu gostaria de começar.

---

## 4. Plano que o app deve implementar (conteúdo)

### 4.1 Divisão semanal padrão (configurável)
Divisão **Superior/Inferior 4x + 1 dia opcional**: cada músculo é treinado 2x por semana, e cada sessão cabe em 1 h.

| Dia | Sessão | Observação |
|---|---|---|
| Seg | **Superior A** (foco peito) | Modo expresso: 5 min de esteira para aquecer, sem esteira no final. Sair 18:45 |
| Ter | Descanso | Casa cedo. Caminhada leve opcional |
| Qua | **Inferior A** (foco quadríceps) | Modo expresso, como na segunda |
| Qui | Descanso | Casa cedo |
| Sex | **Opcional: Pump** (peito, ombro lateral e braços, 40 min) | Só se estiver com energia. Pular não atrapalha o plano |
| Sáb | **Superior B** (foco ombro, costas e braços) | Corrida opcional de manhã |
| Dom | **Inferior B** (foco posterior, glúteo e core) | |

O usuário pode trocar os dias nas configurações. O app redistribui as sessões mantendo **pelo menos 1 dia entre duas sessões do mesmo tipo** e avisa se a combinação ficar ruim.

### 4.2 Estrutura de cada sessão (≤ 60 min)
1. **Aquecimento**: 5 min de esteira + 1–2 séries leves do 1º exercício
2. **Musculação**: ~40–45 min, 5–6 exercícios, 14–17 séries no total
3. **Esteira inclinada**: 10 min no final (inclinação 8–12%, ~5 km/h), **só em dia sem faculdade**

Descanso: compostos 2–2:30 min; isoladores 60–90 s; superséries quando indicado (para economizar tempo).

### 4.3 Treinos

**Superior A (peito)**
| Exercício | Séries × reps |
|---|---|
| Supino reto (barra ou halteres) | 3 × 6–10 |
| Puxada frontal (pulldown) | 3 × 8–12 |
| Supino inclinado com halteres | 3 × 8–12 |
| Remada baixa / cavalinho | 3 × 8–12 |
| Elevação lateral | 3 × 12–20 |
| Supersérie: tríceps corda + rosca direta | 2 × 10–15 cada |

**Inferior A (quadríceps)**
| Exercício | Séries × reps |
|---|---|
| Agachamento livre ou hack (ou leg press) | 3 × 6–10 |
| Stiff / levantamento terra romeno | 3 × 8–10 |
| Cadeira extensora | 2 × 10–15 |
| Mesa flexora | 2 × 10–15 |
| Panturrilha em pé | 3 × 10–15 |
| Prancha ou elevação de pernas | 2 séries |

**Superior B (ombro, costas, braços)**
| Exercício | Séries × reps |
|---|---|
| Desenvolvimento com halteres | 3 × 6–10 |
| Remada curvada ou serrote | 3 × 8–12 |
| Crucifixo máquina / supino inclinado máquina | 3 × 10–15 |
| Puxada pegada neutra ou barra fixa assistida | 2 × 8–12 |
| Elevação lateral | 3 × 12–20 |
| Supersérie: rosca inclinada + tríceps francês | 3 × 10–15 cada |

**Inferior B (posterior, glúteo, core)**
| Exercício | Séries × reps |
|---|---|
| Leg press | 3 × 8–12 |
| Elevação pélvica (hip thrust) | 3 × 8–12 |
| Afundo búlgaro | 2 × 8–12 por perna |
| Mesa flexora | 2 × 10–15 |
| Panturrilha sentado | 3 × 12–20 |
| Abdominal na polia | 3 × 10–15 |

**Pump (opcional, sexta)**: crucifixo máquina, elevação lateral, crucifixo inverso, rosca martelo, tríceps corda, abdominal. 2–3 séries de 12–15 cada, descanso curto.

Cada exercício deve ter **2–3 substitutos** cadastrados (para quando o aparelho estiver ocupado) e uma **dica curta de execução**.

### 4.4 Periodização e progressão
- **Semanas 1–2 (readaptação)**: 2 séries por exercício, parar com **3 repetições de reserva (RIR 3)**. Objetivo: voltar sem lesão e sem dor exagerada.
- **Semana 3 em diante**: séries completas, **RIR 1–2**.
- **Progressão dupla**: quando bater o topo da faixa de reps em **todas** as séries, o app sugere aumentar a carga (+2,5 kg em compostos de membro inferior, +1–2 kg em halteres/isoladores) e volta para o início da faixa.
- **Deload** a cada 6–8 semanas, ou se 2 sessões seguidas regredirem: 1 semana com metade das séries.
- Reavaliar a divisão a cada **12 semanas**.

### 4.5 Corrida (módulo opcional, fim de semana)
Programa iniciante de **8 semanas até 5 km contínuos**, 1–2 sessões por fim de semana, intercalando corrida e caminhada (ex.: semana 1 = 8 × [1 min correndo + 2 min caminhando]; progressão gradual até 30 min contínuos na semana 8).
Registro: distância, tempo, pace calculado e percepção de esforço (escala de 1 a 10).
Regra: **se correr no mesmo dia do Inferior, correr leve e depois do treino, ou em outro dia.**

### 4.6 Alimentação (guia prático, sem contar caloria de tudo)
**Metas calculadas automaticamente a partir do perfil:**
- Gasto: Mifflin-St Jeor × fator de atividade (padrão **1,5**)
- Calorias alvo: **gasto − 15%** (recomposição, déficit leve)
- **Proteína: 2,0 g/kg** (meta principal do app)
- Gordura: ~0,8 g/kg · Carboidratos: o restante
- Ajuste semanal automático pela **média de peso de 7 dias**: perda ideal de **0,3–0,7% do peso por semana**. Se perder mais que isso, sugerir +150 kcal. Se ficar 2–3 semanas sem cair e a cintura não diminuir, sugerir −150 kcal.

**Plano-modelo encaixado na minha rotina** (o app mostra isso como checklist do dia, com a proteína estimada de cada item):
| Momento | Atual | Sugestão do app |
|---|---|---|
| 06:15 café | Café + bolacha | Manter a praticidade e acrescentar **2 ovos cozidos preparados na véspera** ou **1 banana + 1 copo de leite** |
| ~08:00 | YoPro | Preferir o de **23 g** |
| Intervalos | Castanhas | **Porção de 30 g** (castanha é muito calórica, o app deve avisar isso) |
| Almoço | Arroz, feijão, carne | Manter. Carne **150–200 g**, mais salada ou legume. Prato montado: ½ salada/legume, ¼ carne, ¼ arroz e feijão |
| ~16:45 pré-treino | Maçã | Maçã ou banana + (opcional) iogurte/YoPro se a proteína do dia estiver baixa |
| ~20:00 pós-treino | 2 scoops de whey | Manter **e incluir um jantar de verdade** (proteína + arroz/legume). Se o whey for a única coisa da noite, o dia fecha com pouca comida |
| Creatina | Diariamente | **3–5 g por dia, todos os dias, inclusive descanso**. O app pede para conferir na embalagem quantos gramas dão os "4 scoopzinhos" |

**Dias de faculdade (seg/qua):** lembrete para **levar o whey em pó no shaker** e um lanche (fruta + castanha ou sanduíche). O jantar é ao chegar em casa.

**Diagnóstico que o app deve mostrar no onboarding:** com a rotina atual (YoPro + almoço + whey) a proteína fica em **~110 g/dia**, normalmente abaixo da meta de 2 g/kg. Os pontos mais fáceis de corrigir são o **café da manhã** e o **jantar**.

### 4.7 Sono e rotina
- Hoje o sono é de **~6 h** (00:00 → 06:15). Isso atrapalha ganho de massa e perda de gordura.
- Meta: **≥ 7 h**. Nos dias leves (ter/qui/sex), **deitar 23:00 e apagar a luz 23:15**.
- O app registra a hora de dormir e de acordar (entrada manual rápida) e mostra a média semanal.

---

## 5. Funcionalidades (telas)

### 5.1 Onboarding
Pede idade, sexo, altura, peso, dias de treino e se quer o módulo de corrida. Calcula as metas, mostra o resumo do plano e o diagnóstico de proteína.

### 5.2 Hoje (tela principal)
- **Linha do tempo do dia** com base no dia da semana: café, YoPro, almoço, pré-treino, treino, pós-treino/jantar, creatina, estudo e dormir. Cada item tem um checkbox.
- Destaque para **"Agora"**: o que fazer neste horário.
- Barra de **proteína do dia** (soma dos itens marcados + adição rápida: "+1 scoop whey", "+YoPro 23 g", "+100 g carne", "+2 ovos" etc.).
- Card do treino do dia com botão **"Iniciar treino"**.
- Água (opcional, contador simples).

### 5.3 Sessão de treino (a tela mais importante)
- Um exercício por vez, com séries, faixa de reps, RIR alvo e **o que eu fiz na última vez** (carga × reps).
- Inputs grandes de carga e reps, com botões +/−. O app **pré-preenche com o último valor**.
- **Timer de descanso** que começa automaticamente ao marcar a série, com alerta sonoro (o iOS não suporta vibração na web).
- Botão **"Trocar exercício"** para os substitutos.
- **Relógio de orçamento de tempo**: nas segundas e quartas, mostra "você precisa sair às 18:45" e sugere cortar o último isolador se estiver atrasado.
- Ao terminar: resumo (volume total, recordes pessoais, sugestões de progressão para a próxima vez).
- A sessão em andamento sobrevive a fechar e reabrir o app.

### 5.4 Treinos / Plano
Ver e editar a divisão, os exercícios, séries e faixas. Histórico por exercício com gráfico de **carga máxima e 1RM estimado (Epley)**.

### 5.5 Corpo / Progresso
- **Peso**: registro diário opcional (em jejum, ao acordar) e gráfico com **média móvel de 7 dias** (o dado que importa).
- **Medidas** (a cada 2 semanas, com fita): cintura na altura do umbigo, abdômen, pescoço, peito, braço contraído (D/E), coxa (D/E), quadril. O app traz instruções de como medir cada uma.
- **% de gordura estimado pelo método da Marinha americana (US Navy)**, com altura, pescoço e cintura:
  `%G = 495 / (1.0324 − 0.19077·log10(cintura − pescoço) + 0.15456·log10(altura)) − 450` (em cm, para homens; fórmula com quadril para mulheres). Rotular sempre como **estimativa**, porque o que vale é a tendência.
- Campo opcional para valores de **balança de bioimpedância**, se eu comprar uma (mostrar só a tendência, com aviso de baixa precisão).
- **Fotos de progresso** a cada 4 semanas: frente, perfil e costas, com **sobreposição/guia** para repetir a mesma pose e distância. Comparador **lado a lado e com slider antes/depois**.
- Painel de indicadores: peso médio, cintura, %G estimado, treinos na semana, proteína média e sono médio.

### 5.6 Corrida (se ativado)
Programa de 8 semanas, sessão do dia com timer de intervalos (corre/caminha, com bipes) e histórico.

### 5.7 Configurações
- Perfil, dias de treino, horários da rotina (editáveis), fator de atividade e déficit.
- **Exportar / importar backup (JSON)**, incluindo as fotos em base64 (opcional).
- **Exportar a rotina como arquivo `.ics`** para importar no calendário do iPhone, que aí sim gera notificações nativas (lembretes de YoPro, creatina, sair para a academia, dormir).
- Tema claro/escuro (escuro por padrão).

---

## 6. Requisitos técnicos

- **Stack**: Vite + React + TypeScript. Tailwind CSS para estilo. Gráficos com Recharts (ou Chart.js).
- **Sem backend.** Todos os dados ficam no aparelho:
  - **IndexedDB via Dexie** para registros e fotos (Blob)
  - `localStorage` só para preferências pequenas
- **PWA** com `vite-plugin-pwa`: manifest, ícones, funcionamento **100% offline** (a academia pode não ter sinal).
- **GitHub Pages**:
  - `base` do Vite configurado para `/<nome-do-repo>/`
  - **HashRouter** (evita 404 em rotas no Pages)
  - Workflow `.github/workflows/deploy.yml` com GitHub Actions (build + `actions/deploy-pages`)
  - README com passo a passo: criar repo, ativar Pages com "GitHub Actions" como source, instalar no iPhone (Compartilhar → Adicionar à Tela de Início)
- **Privacidade (obrigatório)**: o repositório é público. **Nenhum dado pessoal, peso, medida ou foto pode ir para o código ou para o repositório.** Nada de analytics nem chamadas para serviços externos.
- **Persistência no iOS**: o Safari pode apagar dados de sites não usados por vários dias. Para evitar isso:
  - chamar `navigator.storage.persist()`
  - recomendar a instalação como PWA
  - mostrar lembrete de **backup a cada 2 semanas** se não houver exportação recente
- **Conteúdo do plano em arquivos de dados** (`src/data/workouts.ts`, `exercises.ts`, `meals.ts`, `running.ts`) e não espalhado nos componentes, para eu ajustar fácil.
- **Lógica de cálculo isolada e testada** (Vitest): TMB/gasto, metas de macros, Navy %G, 1RM Epley, regra de progressão dupla, ajuste semanal de calorias, média móvel.
- **UX mobile**:
  - alvos de toque ≥ 44 px
  - fontes grandes na sessão de treino
  - funciona com uma mão
  - evita que a tela apague durante o treino (Wake Lock API quando disponível)
  - respeita a safe-area do iPhone
- Acessibilidade básica: contraste AA, labels nos inputs.

---

## 7. Ordem de entrega

1. **MVP (entregar primeiro e funcionando)**: onboarding, tela Hoje com checklist e proteína, sessão de treino com registro, último desempenho e timer de descanso, persistência, PWA e deploy no GitHub Pages.
2. **Progresso**: peso com média móvel, medidas, Navy %G, gráficos, histórico por exercício.
3. **Fotos de progresso** com guia de pose e comparador.
4. **Inteligência**: sugestões de progressão, ajuste semanal de calorias, deload, orçamento de tempo nos dias de faculdade.
5. **Extras**: módulo de corrida, exportação `.ics`, backup/importação, sono.

A cada etapa: rodar build e testes, e descrever o que foi feito e como testar no celular.

---

## 8. Critérios de aceite

- [ ] Abro no iPhone pelo link do GitHub Pages, instalo na tela inicial e funciona **offline**.
- [ ] Na terça às 16:45 o card "Agora" me diz para comer a maçã/pré-treino. Na segunda, o treino aparece em modo expresso com horário de saída.
- [ ] Na sessão de treino vejo a carga da última vez, registro cada série em ≤ 3 toques e o timer de descanso dispara sozinho.
- [ ] Fechar o app no meio do treino não perde a sessão.
- [ ] Gráfico de peso mostra a média de 7 dias; o %G estimado aparece depois que registro pescoço e cintura.
- [ ] Fotos ficam só no aparelho e o comparador antes/depois funciona.
- [ ] Exporto um backup JSON, apago os dados, importo e tudo volta.
- [ ] O repositório não contém nenhum dado pessoal.

---

## 9. Observações para a IA

- Não sou atleta profissional. Prefira **simples e consistente** a perfeito e complexo.
- O app deve **motivar sem culpar**: perdeu treino → reorganiza a semana, não dá bronca.
- Mostre avisos de segurança básicos: dor articular aguda é motivo para parar. Este app **não substitui** médico ou nutricionista.
- Se algo neste documento for ambíguo, escolha o padrão mais sensato, siga em frente e liste as decisões que tomou no final.
