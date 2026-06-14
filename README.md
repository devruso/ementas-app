# Ementas App

Interface web do Ementas em migracao incremental, preservando o backend atual e reorganizando a experiencia para mobile first.

## Escopo atual

- Lista publica de disciplinas com busca, ordenacao e paginacao.
- Tela publica de detalhe com exportacao oficial em PDF e .docx pelo template IC045, alem da alternancia autenticada entre rascunho e versao publicada.
- Login, recuperacao de senha, cadastro por convite e perfil de usuario.
- Login, recuperacao de senha e cadastro por convite com validacao de e-mail institucional UFBA (@ufba.br).
- Gestao administrativa de usuarios com listagem, busca, ordenacao, remocao e geracao de convite.
- Cadastro completo de nova disciplina com formulario responsivo e importacao documental por PDF ou DOCX para pre-preenchimento do rascunho.
- Ferramentas de importacao em lote na UI: SIAC e SIGAA publico com resumo de execucao (created, skippedExisting, failed, failureCategories).
- Edicao de rascunho e publicacao com dados formais de aprovacao, usando os endpoints existentes do backend.
- Layout responsivo e mobile first, sem mudar contratos da API atual.

## Stack

- Vite
- React + TypeScript
- React Router
- Tailwind CSS
- Axios

## Ambiente

Copie `.env.example` para `.env` e ajuste a URL da API quando necessario.

Variaveis suportadas:

- `VITE_API_URL`: base da API Ementas. Exemplo local: `http://localhost:3333/api`.

## Deploy e configuracao em runtime

- O frontend agora aceita `VITE_API_URL` tanto no build quanto em runtime dentro do container Nginx.
- Em producao, a imagem gera automaticamente o arquivo `/runtime-config.js` a partir de `VITE_API_URL` ou `API_URL`.
- Se nenhuma dessas variaveis for definida, o app usa `window.location.origin + /api` como fallback.

Exemplo de configuracao para deploy:

```sh
VITE_API_URL=https://api.ementas.app.ic.ufba.com.br/api
```

Ou, se frontend e backend estiverem servidos no mesmo dominio com reverse proxy de `/api`, basta nao definir a variavel.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run typecheck`

## Proxima etapa recomendada

Refinar os fluxos administrativos com testes de interface e ampliar a cobertura do cadastro/importacao para casos negativos e revisao humana dos campos extraidos.
