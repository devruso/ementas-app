import { useEffect, useMemo, useState } from 'react';

import { InviteLinkCard } from '../components/InviteLinkCard';
import { FormField } from '../components/FormField';
import { SearchBar } from '../components/SearchBar';
import { SelectField } from '../components/SelectField';
import { UsersTable } from '../components/UsersTable';
import { deleteUserById, generateInvite, getUsers, register } from '../lib/api';
import { AppError } from '../lib/errors';
import { isValidEmail } from '../lib/validation';
import type { ListData, ListFilter, User } from '../types';

const initialFilter: ListFilter = {
  page: 0,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

export const UsersPage = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [users, setUsers] = useState<ListData<User>>({ results: [], total: 0 });
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [removingUserId, setRemovingUserId] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [sendCredentialsByEmail, setSendCredentialsByEmail] = useState(true);
  const [lastGeneratedPassword, setLastGeneratedPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const generateSecurePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@$!%*?&';
    const allChars = upper + lower + numbers + symbols;
    const required = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    while (required.length < 12) {
      required.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    for (let index = required.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const current = required[index];
      required[index] = required[randomIndex];
      required[randomIndex] = current;
    }

    return required.join('');
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilter((current) => ({ ...current, page: 0, search: search || undefined }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadUsers = async () => {
    const response = await getUsers(filter);
    setUsers(response);
  };

  useEffect(() => {
    loadUsers().catch((err) => {
      const appError = err as AppError;
      setError(appError.message);
    });
  }, [filter]);

  const totalPages = useMemo(() => users.meta?.totalPages ?? Math.ceil(users.total / filter.limit), [users, filter.limit]);

  const handleGenerateInvite = async () => {
    try {
      setLoadingInvite(true);
      setError('');
      const token = await generateInvite();
      setInviteToken(token);
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleCreateTeacher = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!teacherName.trim()) {
      setSuccess('');
      setError('Informe o nome do professor.');
      return;
    }

    if (!isValidEmail(teacherEmail)) {
      setSuccess('');
      setError('Informe um e-mail válido para o professor.');
      return;
    }

    try {
      setCreatingTeacher(true);
      setError('');
      setSuccess('');
      const generatedPassword = generateSecurePassword();
      const token = await generateInvite();
      await register(token, teacherName.trim(), teacherEmail.trim(), generatedPassword);

      setLastGeneratedPassword(generatedPassword);
      setSuccess('Professor criado com sucesso. Guarde a senha provisória com segurança.');

      if (sendCredentialsByEmail) {
        const subject = encodeURIComponent('Acesso BDCP - Credenciais iniciais');
        const body = encodeURIComponent(
          `Olá ${teacherName.trim()},\n\nSeu acesso ao BDCP foi criado.\n\nE-mail: ${teacherEmail.trim()}\nSenha provisória: ${generatedPassword}\n\nAo entrar, recomendamos alterar a senha imediatamente.\n\nAtenciosamente,\nEquipe BDCP`
        );

        window.location.href = `mailto:${teacherEmail.trim()}?subject=${subject}&body=${body}`;
      }

      setTeacherName('');
      setTeacherEmail('');
      setInviteToken('');

      await loadUsers();
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setCreatingTeacher(false);
    }
  };

  const handleRemoveUser = async (user: User) => {
    const confirmed = window.confirm(`Deseja remover o usuário ${user.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      setRemovingUserId(user.id);
      setError('');
      await deleteUserById(user.id);
      await loadUsers();
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setRemovingUserId('');
    }
  };

  return (
    <div className="space-y-6 motion-fade">
      <section className="panel interactive-lift p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
              Gestão administrativa
            </div>
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Usuários e convites</h1>
            <p className="mt-2 text-sm leading-7 text-muted">Gerencie professores e administradores usando os endpoints já existentes do backend.</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateInvite}
            disabled={loadingInvite}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingInvite ? 'Gerando convite...' : 'Gerar convite'}
          </button>
        </div>
      </section>

      {inviteToken ? (
        <InviteLinkCard
          inviteLink={`${window.location.origin}/cadastrar/${inviteToken}`}
          onClose={() => setInviteToken('')}
        />
      ) : null}

      <section className="panel interactive-lift min-w-0 p-5 sm:p-6">
        <div className="mb-4 inline-flex rounded-full bg-secondary-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary-700">
          Criação direta
        </div>
        <h2 className="text-xl font-semibold text-ink">Criar professor sem sair do app</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          O sistema gera convite e senha automática segura internamente, concluindo o cadastro do professor na mesma tela.
        </p>

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreateTeacher}>
          <FormField
            label="Nome do professor"
            value={teacherName}
            onChange={(event) => setTeacherName(event.target.value)}
          />
          <FormField
            label="E-mail institucional"
            type="email"
            value={teacherEmail}
            onChange={(event) => setTeacherEmail(event.target.value)}
          />
          <label className="flex items-center gap-2 rounded-2xl border border-line bg-background px-4 py-3 text-sm text-ink md:col-span-2">
            <input
              type="checkbox"
              checked={sendCredentialsByEmail}
              onChange={(event) => setSendCredentialsByEmail(event.target.checked)}
              className="h-4 w-4 rounded border-line"
            />
            Enviar credenciais para e-mail institucional ao concluir o cadastro
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creatingTeacher}
              className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingTeacher ? 'Criando professor...' : 'Criar professor agora'}
            </button>
          </div>
        </form>

        {success ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p>{success}</p>
            {lastGeneratedPassword ? (
              <p>
                Senha provisória gerada: <strong>{lastGeneratedPassword}</strong>
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel interactive-lift overflow-hidden">
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_240px_180px]">
          <SearchBar value={search} placeholder="Nome ou e-mail do usuário" onChange={setSearch} />
          <SelectField
            label="Ordenar por"
            value={filter.sortBy}
            onChange={(event) => setFilter((current) => ({ ...current, page: 0, sortBy: event.target.value }))}
          >
            <option value="createdAt">Data de cadastro</option>
            <option value="name">Nome</option>
            <option value="email">E-mail</option>
            <option value="role">Tipo</option>
          </SelectField>
          <SelectField
            label="Direção"
            value={filter.sortOrder}
            onChange={(event) => setFilter((current) => ({ ...current, page: 0, sortOrder: event.target.value as 'ASC' | 'DESC' }))}
          >
            <option value="DESC">Decrescente</option>
            <option value="ASC">Crescente</option>
          </SelectField>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <UsersTable
        users={users}
        currentPage={filter.page}
        totalPages={Math.max(totalPages, 1)}
        removingUserId={removingUserId}
        onPageChange={(page) => setFilter((current) => ({ ...current, page }))}
        onRemoveUser={handleRemoveUser}
      />
    </div>
  );
};