# Arquitetura do Projeto - PDF Transform 🏗️

Este documento descreve as decisões arquiteturais, a estrutura de pastas e os padrões de código adotados no projeto `pdf-transform`.

## Visão Geral

O projeto foi refatorado de uma estrutura monolítica para uma **Arquitetura Modular Baseada em Features (Feature-Based Architecture)**. Isso significa que o código é organizado em torno de funcionalidades de negócio (domínios), em vez de tipos de arquivos técnicos.

### Por que Feature-Based?
- **Escalabilidade**: Novas funcionalidades podem ser adicionadas como novas pastas em `features/` sem "poluir" componentes globais.
- **Manutenibilidade**: Tudo relacionado a uma feature (componentes, hooks, serviços, tipos) fica junto.
- **Testabilidade**: Facilita testes isolados de domínios específicos.

---

## Estrutura de Diretórios

```
src/
├── features/               # Módulos principais da aplicação
│   ├── analytics/          # Dashboard e estatísticas (StatsDashboard)
│   ├── export/             # Lógica de exportação de dados (ReportExporter)
│   ├── field-extraction/   # Extração de dados via Regex (SmartFields)
│   │   ├── utils/          # fieldExtractor.ts (Lógica pura de regex)
│   │   └── components/
│   ├── pdf-analysis/       # Core do processamento de PDF
│   │   ├── services/       # pdfAnalysisService.ts (Worker + PDF.js)
│   │   ├── hooks/          # usePdfAnalyzer.ts (Estado global da análise)
│   │   └── types/          # Definições de tipos TS
│   ├── pdf-view/           # Visualização do PDF (PagePreview)
│   └── text-search/        # Busca textual (TextSearch)
│
├── components/             # Componentes compartilhados/genéricos
│   ├── pdf/                # Componentes de UI específicos de PDF (SuitabilityGauge)
│   └── ui/                 # Componentes de UI genéricos (ErrorBoundary, Buttons)
│
├── hooks/                  # Hooks globais genéricos (useTheme)
├── utils/                  # Utilitários técnicos (pdfWorker.ts setup)
├── test/                   # Configurações globais de teste (setup.ts)
└── App.tsx                 # Entrypoint / Orquestrador principal
```

---

## Decisões Técnicas Principais

### 1. Web Workers para Processamento Pesado
A análise de PDFs grandes pode bloquear a thread principal (UI).
- **Solução**: Configuramos o `pdfjs-dist` para usar um Worker local (`src/utils/pdfWorker.ts`).
- **Benefício**: A interface permanece responsiva mesmo durante a análise de documentos complexos.

### 2. Dependências Locais (Offline-First)
Removemos dependências de CDN (Content Delivery Networks).
- **Bibliotecas**: `pdfjs-dist` e `tesseract.js` são instaladas via npm.
- **Segurança**: Garante que o código executado é exatamente o que foi auditado/instalado.
- **Confiabilidade**: A aplicação funciona sem internet.

### 3. Gerenciamento de Estado
Utilizamos **React Hooks** nativos (`useState`, `useCallback`, `useEffect`).
- O estado complexo da análise de PDF é centralizado no hook customizado `usePdfAnalyzer`.
- Isso separa a lógica de estado da camada de visualização (UI).

### 4. Estilização
Utilizamos **Tailwind CSS** para agilidade e consistência.
- Suporte a **Dark Mode** nativo via classe `dark` no elemento `html`.
- O hook `useTheme` persiste a preferência do usuário no `localStorage`.

### 5. Tratamento de Erros
- **ErrorBoundary**: Envolve a aplicação para capturar erros de renderização React não tratados.
- **Sonner (Toasts)**: Sistema de notificação sutil para feedback de sucesso/erro, substituindo `alert()` intrusivos.

---

## Fluxo de Dados (Data Flow)

1. **Entrada**: Usuário seleciona arquivo no componente `UploadZone` (dentro de `App.tsx`).
2. **Processamento**:
   - `App.tsx` chama `analyze(file)` do hook `usePdfAnalyzer`.
   - Hook chama serviço `analyzePDF` (`pdfAnalysisService.ts`).
   - Serviço delega parsing para o Worker do PDF.js.
3. **Extração**:
   - Texto extraído é passado para `fieldExtractor.ts` para regex matching.
   - Metadados e estatísticas são calculados.
4. **Atualização de Estado**: Hook atualiza objeto `analysis` com o resultado.
5. **Renderização**: `App.tsx` distribui os dados para `StatsDashboard`, `PagePreview`, etc.

---

## Testes Automatizados

A aplicação possui uma suíte robusta de testes utilizando **Vitest**.

- **Unitários**: Validam lógica de extração (`fieldExtractor`) e serviços (`pdfAnalysis`).
- **Componentes**: Validam renderização condicional e interatividade (`StatsDashboard`, `SuitabilityGauge`).
- **Comando**: `npm test` executa toda a suíte.

---

## Próximos Passos (Roadmap Técnico)

- Implementar lazy loading para rotas (se a aplicação crescer).
- Adicionar suporte completo a OCR para PDFs digitalizados (infraestrutura já preparada em `src/features/ocr`).
- Configurar pipeline de CI/CD (GitHub Actions) para automação de testes e build.
