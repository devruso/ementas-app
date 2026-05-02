import { useEffect, useMemo, useState } from 'react';

import { InviteLinkCard } from '../components/InviteLinkCard';
import { SearchBar } from '../components/SearchBar';
import { SelectField } from '../components/SelectField';
import { UsersTable } from '../components/UsersTable';
import { deleteUserById, generateInvite, getUsers } from '../lib/api';
import { AppError } from '../lib/errors';
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
  const [removingUserId, setRemovingUserId] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError] = useState('');

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
    <div className="space-y-6">
      <section className="panel p-6 sm:p-8">
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
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
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

      <section className="panel overflow-hidden">
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