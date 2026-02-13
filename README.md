# PDF Transform Pro 📄✨

Uma aplicação web moderna e robusta para análise profunda, extração de dados e conversão de arquivos PDF. Construída com **React**, **TypeScript**, **Vite** e **Tailwind CSS**.

## Principais Funcionalidades

### 🔍 Análise Inteligente
- **Detecção de Tipo**: Identifica se o PDF é texto nativo, imagem digitalizada (scanned) ou misto.
- **Score de Qualidade**: Avalia a "saúde" do documento para processos automatizados.
- **Extração de Metadados**: Recupera título, autor, datas e softwares criadores.

### 📊 Dashboard de Estatísticas
- Contagem precisa de palavras, caracteres e imagens.
- Gráficos de distribuição de conteúdo.
- Estimativa de tempo de leitura.

### 🧠 Extração de Campos (Smart Regex)
- Identificação automática de padrões brasileiros:
  - **CPFs** e **CNPJs**
  - **Valores Monetários** (R$)
  - **Datas**
  - **E-mails** e **Links**

### 🛠️ Ferramentas Integradas
- **Visualizador de PDF**: Navegação página a página com zoom e rotação.
- **Busca Textual**: Localize termos com contexto.
- **Exportação**: Baixe os dados extraídos em JSON, CSV ou Texto Puro.
- **Tema**: Suporte nativo a Dark Mode.

---

## Começando

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/pdf-transform.git
cd pdf-transform
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Acesse `http://localhost:5173` no seu navegador.

---

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor local.
- `npm run build`: Compila o projeto para produção.
- `npm run preview`: Visualiza o build de produção localmente.
- `npm test`: Executa a suíte de testes automatizados (Vitest).

---

## Arquitetura e Tecnologias

O projeto segue uma arquitetura modular baseada em **Features**, garantindo escalabilidade e fácil manutenção.

- **Frontend**: React 18, TypeScript
- **Estilização**: Tailwind CSS (v4)
- **Build Tool**: Vite
- **Testes**: Vitest, React Testing Library
- **Processamento de PDF**: PDF.js (via Worker local)
- **OCR (Futuro)**: Tesseract.js preparado

Para mais detalhes técnicos, consulte o arquivo [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Segurança e Performance

- **Execução Offline**: Todas as dependências críticas (`pdfjs-dist`, `tesseract.js`) são empacotadas localmente. Nenhuma requisição externa é feita para processar seus documentos.
- **Web Workers**: O processamento pesado de PDF ocorre em threads separadas para não travar a interface.
- **Error Boundaries**: Proteção global contra falhas de renderização.

---

## Licença

Este projeto é proprietário e desenvolvido para fins de auditoria e transformação digital.