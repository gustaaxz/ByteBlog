# [Clique aqui para acessar - Byte Blog 🚀](https://gustaaxz.github.io/ByteBlog/#)

O **Byte Blog** é uma plataforma moderna e responsiva de publicações, desenvolvida para entregar notícias sobre tecnologia, jogos, informática e o dia a dia. Com um design arrojado e recursos completos de integração, o blog permite que usuários autenticados criem e leiam postagens dinâmicas.

## 🌟 Principais Recursos

- **Design Moderno e Responsivo:** Desenvolvido com CSS Vanilla, utilizando variáveis e uma paleta Premium Dark Mode. Incorpora tendências como Glassmorphism para uma navegação elegante em qualquer dispositivo.
- **Autenticação Completa:** Integração com o Firebase Auth, permitindo login tanto por Email e Senha tradicionais, quanto de forma ágil via Conta Google.
- **Banco de Dados em Tempo Real:** Posts são lidos e salvos na nuvem instantaneamente utilizando o Firebase Firestore.
- **Filtro de Categorias Dinâmico:** Navegue entre artigos de "Jogos", "Informática" e "Notícias" de maneira fluída na mesma página (Single Page Application - SPA).
- **Criação de Artigos:** Usuários autenticados podem compartilhar conhecimentos criando artigos com título, categoria, URL de capa e conteúdo direto pelo painel web.

## 🛠️ Tecnologias Utilizadas

- **HTML5:** Semântica e estrutura acessível.
- **CSS3 (Vanilla):** Flexbox, CSS Grid, Custom Properties (Variáveis), Transições suaves e design adaptativo.
- **JavaScript (Vanilla - ES6 Modules):** Lógica da aplicação, consumo de dados e gerenciamento de estado do DOM sem a necessidade de frameworks pesados.
- **Firebase Authentication (SDK v10):** Gerenciamento seguro de usuários (Google Provider & Email/Password).
- **Firebase Firestore (SDK v10):** Banco de dados NoSQL escalável para gerenciar e recuperar os artigos em tempo real.
- **Phosphor Icons:** Biblioteca de ícones moderna utilizada para a UI.

## 📂 Estrutura do Projeto

```text
Info Blog - Byte Blog/
├── index.html                 # Estrutura principal, modais e barra de navegação
├── css/
│   └── style.css              # Arquivo contendo todo o design, variáveis, animações e responsividade
├── js/
│   ├── app.js                 # Lógica de interface (UI), modais, notificações (toasts) e renderização dos posts
│   ├── auth.js                # Funções de Login, Cadastro, Logout e Monitoramento de estado do usuário
│   ├── db.js                  # Lógica de conexão com o Firestore (Busca e Criação de artigos)
│   └── firebase-config.js     # Configurações do SDK e inicialização do projeto Firebase
└── README.md                  # Documentação do projeto
```

## 🚀 Como Executar o Projeto Localmente

Por ser um projeto que utiliza Módulos ES6 do JavaScript (`type="module"`), você precisará de um servidor web local para evitar problemas de CORS no navegador.

### Pré-requisitos
- Um editor de código (como VS Code)
- Python ou Node.js instalados na máquina para rodar um servidor local

### Passo a Passo

1. **Clone o repositório ou baixe a pasta do projeto.**
2. **Abra a pasta no terminal.**
3. **Inicie o servidor local:**
   - Usando **Python**: 
     ```bash
     python -m http.server 3000
     ```
   - Usando **Node.js (npx)**:
     ```bash
     npx http-server -p 3000
     ```
4. **Acesse no navegador:** `http://localhost:3000`

---

## 🔒 Configuração do Firebase

Para que o Banco de Dados e o Login funcionem na sua própria nuvem, certifique-se de configurar o Firebase:

1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Crie um projeto.
3. Habilite a **Authentication** (Provedor Google e Email/Senha).
4. Crie um **Firestore Database** e configure as regras de leitura e gravação para teste ou usuários autenticados.
5. Substitua o objeto `firebaseConfig` no arquivo `js/firebase-config.js` pelas credenciais do seu projeto Web App.

---
*Desenvolvido com foco em performance e experiência do usuário (UX).*
