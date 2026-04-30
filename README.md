# [Clique aqui para acessar - Byte Blog 🚀](https://byteblog-c4f4a.firebaseapp.com/)

O **Byte Blog** é uma plataforma moderna e responsiva de publicações, desenvolvida para entregar notícias sobre tecnologia, jogos, informática e o dia a dia. Com um design arrojado e recursos completos de integração, o blog permite que usuários autenticados criem, leiam e interajam com postagens dinâmicas em um ecossistema completo de portal.

## 🌟 Principais Recursos (v2.2.0)

- **Design Premium Multi-Tema:** Interface Dark Mode por padrão com opção de Tema Claro (Light Mode), utilizando Glassmorphism e animações fluidas.
- **Ecossistema Social:**
  - Perfis de Autor Públicos com estatísticas e badges de conquista.
  - Sistema de Favoritos (Bookmarks) para leitura posterior.
  - Avaliação de artigos via estrelas (Rating).
  - Comentários interativos com suporte a edição pelo autor e moderação por administradores.
- **Funcionalidades de Portal:**
  - **Infinite Scroll:** Carregamento automático de notícias conforme a rolagem.
  - **PWA (Progressive Web App):** Blog instalável como aplicativo nativo em dispositivos móveis e desktop.
  - **Busca Avançada:** Pesquisa em tempo real com filtros por data e popularidade.
  - **Sugestão de Conteúdo:** Seção de artigos relacionados baseada na categoria.
- **Upload de Mídia Profissional:** Integração com API do ImgBB para upload direto de imagens de capa e fotos de perfil, eliminando a necessidade de URLs manuais.
- **Acessibilidade e UX:** 
  - Barra de progresso de leitura no topo da página.
  - Estimativa dinâmica de tempo de leitura.
  - Tradução automática multilingue integrada.
- **Segurança e Moderação:** Sistema de denúncia (Report) integrado com painel administrativo para análise e gestão de conteúdo.

## 🛠️ Tecnologias Utilizadas

- **HTML5 & CSS3 (Vanilla):** Estrutura semântica e design adaptativo com CSS Variables e Modern Layouts.
- **JavaScript (ES6 Modules):** Lógica reativa, gerenciamento de estado e Intersection Observer API para performance.
- **Firebase SDK v10:**
  - **Auth:** Login seguro via Google e Email/Senha.
  - **Firestore:** Banco de dados NoSQL em tempo real para posts, comentários e denúncias.
- **ImgBB API:** Serviço de hospedagem de imagens para upload de mídia.
- **Google Translate API:** Tradução dinâmica de conteúdo.
- **Phosphor Icons:** Biblioteca de ícones moderna e consistente.

## 📂 Estrutura do Projeto

```text
Info Blog - Byte Blog/
├── index.html                 # Estrutura principal e modais (SPA)
├── manifest.json              # Configurações do PWA
├── sw.js                      # Service Worker para suporte offline e PWA
├── css/
│   └── style.css              # Design System, Variáveis e Temas
├── js/
│   ├── app.js                 # Lógica de UI, Modais, Scroll Infinito e Toasts
│   ├── auth.js                # Gerenciamento de Usuário e Perfis
│   ├── db.js                  # Interface de comunicação com Firestore e Lógica de Negócio
│   ├── utils.js               # Utilitários de Upload e Integração com APIs externas
│   └── firebase-config.js     # Inicialização do Firebase
└── README.md                  # Documentação do projeto
```

## 🚀 Como Executar o Projeto Localmente

Por utilizar Módulos ES6 e Service Workers, você precisará de um servidor web local.

1. **Clone o repositório.**
2. **Abra a pasta no terminal.**
3. **Inicie o servidor local:**
   - Com **Python**: `python -m http.server 3000`
   - Com **Node.js**: `npx http-server -p 3000`
4. **Acesse:** `http://localhost:3000`

---

## 🔒 Configuração Necessária

Para funcionalidade total, configure:
1. **Firebase:** Authentication (Google/Email) e Firestore Database.
2. **ImgBB:** Obtenha uma API Key e substitua em `js/utils.js`.

---
*Byte Blog v2.2.0 - Elevando a experiência de leitura tech.*

