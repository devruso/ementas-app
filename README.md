# Ementas App

Interface web do BDCP em migracao incremental, preservando o backend atual e reorganizando a experiencia para mobile first.

## Escopo atual

- Lista publica de disciplinas com busca, ordenacao e paginacao.
- Tela publica de detalhe com exportacao oficial em PDF e .docx pelo template IC045, alem da alternancia autenticada entre rascunho e versao publicada.
- Login, recuperacao de senha, cadastro por convite e perfil de usuario.
- Gestao administrativa de usuarios com listagem, busca, ordenacao, remocao e geracao de convite.
- Cadastro completo de nova disciplina com formulario responsivo e importacao documental por PDF ou DOCX para pre-preenchimento do rascunho.
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

- `VITE_API_URL`: base da API BDCP. Exemplo local: `http://localhost:3333/api`.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run typecheck`

## Proxima etapa recomendada

Refinar os fluxos administrativos com testes de interface e ampliar a cobertura do cadastro/importacao para casos negativos e revisao humana dos campos extraidos.