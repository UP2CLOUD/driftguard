# DriftGuard — Social Media Content
## 3 Languages: EN (US) · ES (Spain) · PT (BR/PT)

---

## 🐦 TWITTER/X — LAUNCH THREAD

### EN
Tweet 1: We built DriftGuard because Cursor wrote Terraform that deleted our production RDS.

Twice.

Introducing: the safety layer between your AI agents and production infra. 🧵

Tweet 2: The problem:
→ Cursor / Claude Code / Devin write Terraform
→ They don't know about the incident from 3 months ago
→ They don't see the $480/mo cost spike they're introducing
→ They can't tell if the S3 bucket they're modifying is the state backend

Tweet 3: DriftGuard intercepts every Terraform PR. In <2s it runs:
• Cost delta (Infracost)
• Security scan (Checkov — 255 rules)
• Live drift check (STS)
• Semantic memory recall (pgvector)

Then gates the merge if risk > 70.

Tweet 4: The memory part is the moat.

Every blocked deploy → 384-d embedding.
Open a similar PR 6 months later → original incident surfaces in the comment.

Your agents stop making the same mistake twice.

Tweet 5: Currently in early access.
GitHub App — installs in 30s. No code changes.

driftguard.io

---

### ES
Tweet 1: Construimos DriftGuard porque Cursor escribió Terraform que eliminó nuestra RDS de producción.

Dos veces.

Presentamos: la capa de seguridad entre tus agentes de IA y la infra de producción. 🧵

Tweet 2: El problema:
→ Cursor / Claude Code / Devin escriben Terraform
→ No saben del incidente de hace 3 meses
→ No ven el incremento de €480/mes que están introduciendo
→ No pueden saber si el bucket S3 que modifican es el backend de estado

Tweet 3: DriftGuard intercepta cada PR de Terraform. En <2s ejecuta:
• Delta de coste (Infracost)
• Escaneo de seguridad (Checkov — 255 reglas)
• Verificación de drift en vivo (STS)
• Recuperación de memoria semántica (pgvector)

Y bloquea el merge si el riesgo > 70.

Tweet 4: La memoria es la ventaja competitiva.

Cada deploy bloqueado → embedding 384-d.
Un PR similar 6 meses después → el incidente original aparece en el comentario.

Tus agentes dejan de cometer el mismo error dos veces.

Tweet 5: Actualmente en acceso anticipado.
GitHub App — instalación en 30s. Sin cambios de código.

driftguard.io

---

### PT
Tweet 1: Criámos o DriftGuard porque o Cursor escreveu Terraform que apagou o nosso RDS de produção.

Duas vezes.

Apresentamos: a camada de segurança entre os teus agentes de IA e a infra de produção. 🧵

Tweet 2: O problema:
→ Cursor / Claude Code / Devin escrevem Terraform
→ Não sabem do incidente de há 3 meses
→ Não vêem o aumento de €480/mês que estão a introduzir
→ Não conseguem saber se o bucket S3 que estão a modificar é o state backend

Tweet 3: O DriftGuard intercepta cada PR Terraform. Em <2s executa:
• Delta de custo (Infracost)
• Scan de segurança (Checkov — 255 regras)
• Verificação de drift em tempo real (STS)
• Recall de memória semântica (pgvector)

E bloqueia o merge se o risco > 70.

Tweet 4: A memória é o diferenciador.

Cada deploy bloqueado → embedding 384-d.
Um PR similar 6 meses depois → incidente original aparece no comentário.

Os teus agentes param de cometer o mesmo erro duas vezes.

Tweet 5: Actualmente em acesso antecipado.
GitHub App — instala em 30s. Sem alterações de código.

driftguard.io

---

## 💼 LINKEDIN — LONG FORM

### EN
We spent 3 months building the thing we wished existed.

Our platform team runs AI agents daily — Cursor for infra, Claude Code for config changes, occasionally Devin for larger refactors. They're incredible at writing Terraform. They have no idea what happened last quarter.

The incident that triggered DriftGuard: an agent opened a PR that changed our RDS instance class from db.r5.large to db.r5.4xlarge. Valid Terraform. Passed CI. Got merged by someone who didn't check the cost. €480/mo extra. Noticed 3 weeks later.

The fix took 10 minutes. The delay cost €360.

But the deeper problem: the next agent that touches that cluster won't know this happened. There's no institutional memory. Every AI agent starts from zero.

DriftGuard solves this.

Every blocked deploy, every cost anomaly, every policy violation → stored as a vector embedding. The next time an agent opens a similar PR, the original incident surfaces automatically with a similarity score.

Your agents learn from production. Permanently.

Plus: cost delta on every PR (Infracost), security scan (Checkov), live drift detection (STS AssumeRole), compliance evidence for DORA/NIS2.

All in under 2 seconds. GitHub App. No code changes.

Early access is open. Link in comments.

---

### ES
Pasamos 3 meses construyendo lo que deseábamos que existiera.

Nuestro equipo de plataforma usa agentes de IA a diario — Cursor para infra, Claude Code para cambios de configuración, ocasionalmente Devin para refactorizaciones mayores. Son increíbles escribiendo Terraform. No tienen ni idea de lo que pasó el trimestre pasado.

El incidente que desencadenó DriftGuard: un agente abrió un PR que cambiaba nuestra instancia RDS de db.r5.large a db.r5.4xlarge. Terraform válido. Pasó CI. Alguien lo fusionó sin verificar el coste. €480/mes extra. Lo notamos 3 semanas después.

La corrección tardó 10 minutos. El retraso costó €360.

El problema más profundo: el próximo agente que toque ese clúster no sabrá que esto ocurrió. No hay memoria institucional. Cada agente de IA empieza desde cero.

DriftGuard resuelve esto.

Cada deploy bloqueado, cada anomalía de coste, cada violación de política → almacenado como embedding vectorial. La próxima vez que un agente abra un PR similar, el incidente original aparece automáticamente con una puntuación de similitud.

Tus agentes aprenden de producción. Permanentemente.

Además: delta de coste en cada PR (Infracost), escaneo de seguridad (Checkov), detección de drift en vivo (STS AssumeRole), evidencia de cumplimiento para DORA/NIS2.

Todo en menos de 2 segundos. GitHub App. Sin cambios de código.

El acceso anticipado está abierto. Enlace en comentarios.

---

### PT
Passámos 3 meses a construir o que gostaríamos que existisse.

A nossa equipa de plataforma usa agentes de IA diariamente — Cursor para infra, Claude Code para mudanças de configuração, ocasionalmente Devin para refactorizações maiores. São incríveis a escrever Terraform. Não fazem ideia do que aconteceu no trimestre passado.

O incidente que desencadeou o DriftGuard: um agente abriu um PR que mudava a nossa instância RDS de db.r5.large para db.r5.4xlarge. Terraform válido. Passou no CI. Alguém fez merge sem verificar o custo. €480/mês extra. Notámos 3 semanas depois.

A correcção demorou 10 minutos. O atraso custou €360.

O problema mais profundo: o próximo agente que toque nesse cluster não vai saber que isto aconteceu. Não há memória institucional. Cada agente de IA começa do zero.

O DriftGuard resolve isto.

Cada deploy bloqueado, cada anomalia de custo, cada violação de política → guardado como vector embedding. Da próxima vez que um agente abra um PR semelhante, o incidente original aparece automaticamente com uma pontuação de similaridade.

Os teus agentes aprendem de produção. Permanentemente.

Mais: delta de custo em cada PR (Infracost), scan de segurança (Checkov), detecção de drift em tempo real (STS AssumeRole), evidência de conformidade para DORA/NIS2.

Tudo em menos de 2 segundos. GitHub App. Sem alterações de código.

O acesso antecipado está aberto. Link nos comentários.

