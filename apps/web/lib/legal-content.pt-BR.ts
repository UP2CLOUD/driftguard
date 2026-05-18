import type { LegalDocumentContent } from "./legal-content";

const EFFECTIVE = "2026-05-17";
const OPERATOR = 'UP2CLOUD Unipessoal Lda. ("UP2CLOUD", "nós" ou "nosso"), operador da plataforma DriftGuard ("DriftGuard", "Serviço").';
const CONTACT_PRIVACY = "privacy@driftguard.io";
const CONTACT_LEGAL = "legal@driftguard.io";

export const privacyPolicyPtBR: LegalDocumentContent = {
  label: "Legal",
  title: "Política de Privacidade",
  effectiveDate: EFFECTIVE,
  lastUpdated: EFFECTIVE,
  intro: `Esta Política de Privacidade descreve como ${OPERATOR} coleta, usa, armazena e protege dados pessoais quando você visita nossos sites, cria uma conta, conecta integrações GitHub ou de nuvem, ou usa o DriftGuard. O DriftGuard é uma plataforma B2B de DevSecOps e FinOps que analisa pull requests de infraestrutura como código para sinais de custo, drift, segurança e conformidade. Processamos dados principalmente como processador em nome de sua organização e como controlador para dados de conta, faturação e melhoria de produto descritos abaixo.`,
  sections: [
    {
      id: "scope",
      title: "1. Âmbito e funções",
      paragraphs: [
        "Esta política aplica-se a todos os serviços DriftGuard, incluindo a aplicação web, API, GitHub App e suporte por email. Ao usar o Serviço, você aceita as práticas descritas nesta política.",
        "Atuamos como controlador para dados de conta e faturação, e como processador para dados de infraestrutura submetidos pela sua organização através de integrações de terceiros.",
      ],
    },
    {
      id: "collection",
      title: "2. Informações que recolhemos",
      paragraphs: [
        "Recolhemos informações que você nos fornece diretamente, incluindo nome, endereço de email, detalhes da organização e informações de faturação.",
        "Através da integração GitHub, acedemos a metadados de pull requests, conteúdo de ficheiros Terraform/OpenTofu e registos de pipeline relevantes para a análise.",
        "Recolhemos automaticamente dados de utilização, incluindo endereços IP, tipo de browser, páginas visitadas e caraterísticas do dispositivo.",
      ],
      list: [
        "Dados de conta: email, nome, organização, plano de subscrição",
        "Dados de integração: repositórios GitHub, conteúdo de PR, ficheiros IaC",
        "Dados de utilização: logs, métricas de desempenho, feedback",
        "Dados de faturação: email de faturação, país (detalhes de cartão geridos por Stripe)",
      ],
    },
    {
      id: "use",
      title: "3. Como usamos as informações",
      paragraphs: [
        "Usamos os seus dados para fornecer, manter e melhorar o Serviço, processar pagamentos, enviar comunicações relacionadas com o serviço e garantir a segurança da plataforma.",
        "Não vendemos dados pessoais a terceiros nem os usamos para fins publicitários.",
      ],
    },
    {
      id: "legal-basis",
      title: "4. Base legal (EEE/UK)",
      paragraphs: [
        "O tratamento de dados pessoais de residentes no EEE/UK baseia-se em: execução contratual (Art. 6(1)(b) RGPD) para fornecimento do serviço; interesses legítimos (Art. 6(1)(f)) para segurança e melhoria; obrigação legal para conformidade fiscal; e consentimento onde aplicável.",
      ],
    },
    {
      id: "sharing",
      title: "5. Partilha e subprocessadores",
      paragraphs: [
        "Podemos partilhar dados com subprocessadores de confiança necessários para a prestação do serviço, incluindo fornecedores de infraestrutura cloud, processadores de pagamento e ferramentas de suporte.",
        "Todos os subprocessadores estão vinculados a acordos de processamento de dados e ao mesmo nível de proteção que aplicamos internamente.",
      ],
      list: [
        "Google Cloud Platform — infraestrutura de alojamento (UE)",
        "Stripe — processamento de pagamentos",
        "Anthropic — análise de IA (dados anonimizados)",
        "Vercel — alojamento da aplicação web",
      ],
    },
    {
      id: "transfers",
      title: "6. Transferências internacionais",
      paragraphs: [
        "Os dados são alojados principalmente na União Europeia. Quando transferimos dados para fora do EEE, utilizamos mecanismos aprovados pela Comissão Europeia, incluindo Cláusulas Contratuais Padrão.",
      ],
    },
    {
      id: "retention",
      title: "7. Retenção de dados",
      paragraphs: [
        "Retemos dados pessoais apenas pelo tempo necessário para os fins descritos nesta política ou conforme exigido por lei. Os dados de conta são eliminados 30 dias após o encerramento da conta. Os logs de análise são retidos por 90 dias.",
      ],
    },
    {
      id: "security",
      title: "8. Segurança",
      paragraphs: [
        "Implementamos medidas técnicas e organizacionais adequadas para proteger dados pessoais, incluindo encriptação em repouso e em trânsito, controlos de acesso e monitorização de segurança contínua.",
        "Em caso de violação de dados que afete os seus direitos e liberdades, notificaremos as autoridades competentes e os utilizadores afetados nos prazos legais aplicáveis.",
      ],
    },
    {
      id: "cookies",
      title: "9. Cookies e tecnologias similares",
      paragraphs: [
        "Utilizamos cookies essenciais para autenticação e segurança de sessão. Não utilizamos cookies de rastreio de terceiros para publicidade.",
      ],
    },
    {
      id: "rights",
      title: "10. Os seus direitos",
      paragraphs: [
        "Se for residente no EEE/UK/Suíça, tem o direito de aceder, corrigir, apagar, portar, restringir ou opor-se ao tratamento dos seus dados pessoais. Para exercer estes direitos, contacte-nos em " + CONTACT_PRIVACY + ".",
        "Tem também o direito de apresentar reclamação junto da autoridade de proteção de dados da sua jurisdição.",
      ],
    },
    {
      id: "children",
      title: "11. Menores",
      paragraphs: [
        "O Serviço destina-se a profissionais com 16 ou mais anos. Não recolhemos intencionalmente dados de menores de 16 anos.",
      ],
    },
    {
      id: "changes",
      title: "12. Alterações a esta política",
      paragraphs: [
        "Podemos atualizar esta política periodicamente. Notificaremos alterações materiais por email ou através de aviso na plataforma com pelo menos 14 dias de antecedência.",
      ],
    },
    {
      id: "contact",
      title: "13. Contacto",
      paragraphs: [
        `Para questões relacionadas com privacidade: ${CONTACT_PRIVACY}`,
        `Para questões legais gerais: ${CONTACT_LEGAL}`,
        "UP2CLOUD Unipessoal Lda., Portugal, União Europeia.",
      ],
    },
  ],
};

export const termsOfServicePtBR: LegalDocumentContent = {
  label: "Legal",
  title: "Termos de Serviço",
  effectiveDate: EFFECTIVE,
  lastUpdated: EFFECTIVE,
  intro: `Estes Termos de Serviço ("Termos") constituem um acordo vinculativo entre ${OPERATOR} e a entidade ou pessoa que acede ou usa o DriftGuard ("Cliente", "você"). Ao usar o Serviço, aceita estes Termos.`,
  sections: [
    {
      id: "service",
      title: "1. O Serviço",
      paragraphs: [
        "O DriftGuard é uma plataforma B2B de revisão de pull requests de infraestrutura como código que fornece análise de custo, segurança, drift e conformidade regulatória (DORA, NIS2, ISO 27001).",
        "O Serviço é fornecido 'tal como está' com SLAs definidos no plano contratado.",
      ],
    },
    {
      id: "eligibility",
      title: "2. Elegibilidade e contas",
      paragraphs: [
        "Deve ter pelo menos 18 anos e autoridade para vincular a sua organização a estes Termos.",
        "É responsável por todas as atividades realizadas na sua conta e por manter a confidencialidade das credenciais de acesso.",
      ],
    },
    {
      id: "acceptable-use",
      title: "3. Uso aceitável",
      paragraphs: [
        "Não pode usar o Serviço para fins ilegais, para interferir com outros utilizadores, para contornar medidas de segurança ou de qualquer forma que viole estes Termos.",
      ],
    },
    {
      id: "data-ip",
      title: "4. Dados do cliente e propriedade intelectual",
      paragraphs: [
        "Mantém todos os direitos sobre os seus dados de infraestrutura. Concede-nos uma licença limitada para processar esses dados exclusivamente para fornecer o Serviço.",
        "O DriftGuard e toda a sua tecnologia subjacente pertencem à UP2CLOUD. Estes Termos não lhe concedem nenhum direito de propriedade intelectual sobre o Serviço.",
      ],
    },
    {
      id: "third-party",
      title: "5. Serviços de terceiros",
      paragraphs: [
        "O Serviço integra com serviços de terceiros (GitHub, AWS, GCP, Azure). A sua utilização desses serviços está sujeita aos termos respetivos.",
      ],
    },
    {
      id: "billing",
      title: "6. Subscrições e faturação",
      paragraphs: [
        "As subscrições são cobradas por repositório por mês. O pagamento é processado por Stripe.",
        "As subscrições renovam automaticamente até serem canceladas. Reembolsos são tratados caso a caso.",
      ],
    },
    {
      id: "confidentiality",
      title: "7. Confidencialidade",
      paragraphs: [
        "Ambas as partes concordam em manter confidenciais as informações não públicas da outra parte e em não as divulgar a terceiros sem consentimento prévio.",
      ],
    },
    {
      id: "disclaimers",
      title: "8. Isenções de responsabilidade",
      paragraphs: [
        'O Serviço é fornecido "tal como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas.',
      ],
    },
    {
      id: "liability",
      title: "9. Limitação de responsabilidade",
      paragraphs: [
        "Na máxima extensão permitida por lei, a responsabilidade total da UP2CLOUD não excederá os valores pagos pelo Cliente nos 12 meses anteriores ao evento que deu origem à reclamação.",
      ],
    },
    {
      id: "indemnification",
      title: "10. Indemnização",
      paragraphs: [
        "Concorda em indemnizar e isentar a UP2CLOUD de reclamações de terceiros decorrentes do seu uso do Serviço ou da violação destes Termos.",
      ],
    },
    {
      id: "termination",
      title: "11. Rescisão",
      paragraphs: [
        "Qualquer das partes pode rescindir este acordo com aviso prévio de 30 dias. A UP2CLOUD pode suspender ou rescindir o acesso imediatamente por violação material destes Termos.",
      ],
    },
    {
      id: "governing-law",
      title: "12. Lei aplicável e disputas",
      paragraphs: [
        "Estes Termos são regidos pela lei portuguesa. As disputas serão resolvidas pelos tribunais competentes de Portugal, sem prejuízo do direito de qualquer das partes de solicitar medidas cautelares.",
      ],
    },
    {
      id: "changes",
      title: "13. Alterações",
      paragraphs: [
        "Podemos modificar estes Termos com aviso de 14 dias. O uso continuado após as alterações constitui aceitação dos novos Termos.",
      ],
    },
    {
      id: "contact",
      title: "14. Contacto",
      paragraphs: [
        `Para questões legais: ${CONTACT_LEGAL}`,
        "UP2CLOUD Unipessoal Lda., Portugal, União Europeia.",
      ],
    },
  ],
};
