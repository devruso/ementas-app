import { useEffect, useMemo, useState } from 'react';

import { InviteLinkCard } from '../components/InviteLinkCard';
import { FormField } from '../components/FormField';
import { SearchBar } from '../components/SearchBar';
import { SelectField } from '../components/SelectField';
import { UsersTable } from '../components/UsersTable';
import { useAuth } from '../contexts/AuthContext';
import { createTeacherByAdmin, deleteUserById, generateInvite, getUsers, sendInviteByEmail, updateUserRole } from '../lib/api';
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
  const auth = useAuth();
  const canDeleteUsers = auth.user?.role === 'super_admin';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [users, setUsers] = useState<ListData<User>>({ results: [], total: 0 });
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState('');
  const [removingUserId, setRemovingUserId] = useState('');
  const [roleDraftByUserId, setRoleDraftByUserId] = useState<Record<string, User['role']>>({});
  const [inviteToken, setInviteToken] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInviteEmail, setSendingInviteEmail] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [sendCredentialsByEmail, setSendCredentialsByEmail] = useState(true);
  const [lastGeneratedPassword, setLastGeneratedPassword] = useState('');
  const [lastPasswordSetupLink, setLastPasswordSetupLink] = useState('');
  const [success, setSuccess] = useState('');
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
    setRoleDraftByUserId((current) => {
      const next = { ...current };

      response.results.forEach((user) => {
        if (!next[user.id]) {
          next[user.id] = user.role;
        }
      });

      return next;
    });
  };

  useEffect(() => {
    loadUsers().catch((err) => {
      const appError = err as AppError;
      setError(appError.message);
    });
  }, [filter]);

  useEffect(() => {
    if (!auth.user?.email) {
      return;
    }

    setInviteEmail((current) => current || auth.user?.email || '');
  }, [auth.user?.email]);

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
      const createdTeacher = await createTeacherByAdmin(
        teacherName.trim(),
        teacherEmail.trim(),
        sendCredentialsByEmail
      );

      setLastGeneratedPassword(createdTeacher.temporaryPassword);
      setLastPasswordSetupLink(createdTeacher.passwordSetupLink || '');

      if (createdTeacher.emailDeliveryStatus === 'sent') {
        setSuccess('Professor criado com sucesso. O e-mail enviado contém um link para definir a senha.');
      } else if (createdTeacher.emailDeliveryStatus === 'mock') {
        setSuccess('Professor criado com sucesso. Aviso: o envio de e-mail está em modo de simulação (MAILER_MOCK=true).');
      } else if (createdTeacher.emailDeliveryStatus === 'failed') {
        setSuccess('Professor criado com sucesso, mas o envio de e-mail falhou. Compartilhe o link de definição de senha manualmente.');
        setError(createdTeacher.emailDeliveryError || 'Falha no envio do e-mail institucional.');
      } else {
        setSuccess('Professor criado com sucesso. O link de definição de senha foi gerado com segurança.');
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

  const handleSendInviteByEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidEmail(inviteEmail)) {
      setSuccess('');
      setError('Informe um e-mail institucional válido para envio do convite.');
      return;
    }

    try {
      setSendingInviteEmail(true);
      setError('');
      setSuccess('');

      const inviteDelivery = await sendInviteByEmail(inviteEmail.trim(), window.location.origin);

      setInviteToken(inviteDelivery.token);

      if (inviteDelivery.emailDeliveryStatus === 'failed') {
        setSuccess('Convite gerado, mas o envio por e-mail falhou. Compartilhe o link manualmente.');
        setError(inviteDelivery.emailDeliveryError || 'Falha no envio de convite por e-mail.');
      } else if (inviteDelivery.emailDeliveryStatus === 'mock') {
        setSuccess('Convite gerado e enviado em modo simulado (MAILER_MOCK/fallback). Verifique o log da API para validar o conteúdo.');
      } else {
        setSuccess(`Convite enviado com sucesso para ${inviteDelivery.email}.`);
      }
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setSendingInviteEmail(false);
    }
  };

  const handleRemoveUser = async (user: User) => {
    if (!canDeleteUsers) {
      setError('Apenas super admin pode remover usuarios.');
      return;
    }

    if (user.id === auth.user?.id) {
      setError('Nao e permitido remover o proprio usuario.');
      return;
    }

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

  const handleUpdateRole = async (user: User) => {
    const nextRole = roleDraftByUserId[user.id] || user.role;

    if (nextRole === user.role) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja alterar o perfil de ${user.name} para ${nextRole.replace('_', ' ')}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingRoleUserId(user.id);
      setError('');
      setSuccess('');
      await updateUserRole(user.id, nextRole);
      setSuccess('Perfil atualizado com sucesso.');
      await loadUsers();
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setUpdatingRoleUserId('');
    }
  };

  return (
    <div className="space-y-6 motion-fade">
      <section className="panel interactive-lift p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
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

        <form className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]" onSubmit={handleSendInviteByEmail}>
          <FormField
            label="Enviar convite para e-mail institucional"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="jamilsonj@ufba.br"
          />
          <button
            type="submit"
            disabled={sendingInviteEmail}
            className="inline-flex h-14 items-center justify-center self-end rounded-2xl border border-primary-200 bg-white px-5 py-3 font-semibold text-primary-700 transition hover:-translate-y-0.5 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingInviteEmail ? 'Enviando convite...' : 'Enviar convite por e-mail'}
          </button>
        </form>

        <p className="mt-3 text-xs text-muted">
          Dica: você pode usar seu próprio e-mail UFBA para validar o envio agora e depois repetir para o professor.
        </p>
      </section>

      {inviteToken ? (
        <InviteLinkCard
          inviteLink={`${window.location.origin}/cadastrar/${inviteToken}`}
          onClose={() => setInviteToken('')}
        />
      ) : null}

      <section className="panel interactive-lift min-w-0 p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-ink">Criar professor sem sair do app</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          O sistema gera o vínculo de acesso automaticamente, concluindo o cadastro do professor na mesma tela.
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
            Enviar link de definição de senha para e-mail institucional ao concluir o cadastro
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
            {lastPasswordSetupLink && (error || !sendCredentialsByEmail) ? (
              <p>
                Link de definição de senha:{' '}
                <a href={lastPasswordSetupLink} target="_blank" rel="noreferrer" className="font-semibold underline">
                  {lastPasswordSetupLink}
                </a>
              </p>
            ) : null}
            {lastGeneratedPassword && error ? (
              <p>
                Senha provisória interna: <strong>{lastGeneratedPassword}</strong>
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
        currentUserId={auth.user?.id}
        currentUserRole={auth.user?.role}
        canDeleteUsers={canDeleteUsers}
        roleDraftByUserId={roleDraftByUserId}
        updatingRoleUserId={updatingRoleUserId}
        removingUserId={removingUserId}
        onPageChange={(page) => setFilter((current) => ({ ...current, page }))}
        onRemoveUser={handleRemoveUser}
        onRoleDraftChange={(userId, role) => {
          setRoleDraftByUserId((current) => ({ ...current, [userId]: role }));
        }}
        onUpdateUserRole={handleUpdateRole}
      />
    </div>
  );
};