import type { ListData, User } from '../types';

const roleLabelMap: Record<User['role'], string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  teacher: 'Professor',
};

interface UsersTableProps {
  users: ListData<User>;
  currentPage: number;
  totalPages: number;
  currentUserId?: string;
  currentUserRole?: User['role'];
  canDeleteUsers?: boolean;
  roleDraftByUserId?: Record<string, User['role']>;
  updatingRoleUserId?: string;
  removingUserId?: string;
  onPageChange: (page: number) => void;
  onRemoveUser: (user: User) => Promise<void>;
  onRoleDraftChange?: (userId: string, role: User['role']) => void;
  onUpdateUserRole?: (user: User) => Promise<void>;
}

export const UsersTable = ({
  users,
  currentPage,
  totalPages,
  currentUserId,
  currentUserRole,
  canDeleteUsers,
  roleDraftByUserId,
  updatingRoleUserId,
  removingUserId,
  onPageChange,
  onRemoveUser,
  onRoleDraftChange,
  onUpdateUserRole,
}: UsersTableProps) => {
  const hasPreviousPage = currentPage >= 1;
  const hasNextPage = currentPage + 1 < totalPages;
  const canManageRoles = currentUserRole === 'super_admin';

  return (
    <div className="panel interactive-lift overflow-hidden">
      <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(240px,1.6fr)_120px_160px_120px] gap-4 border-b border-line bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70 md:grid">
        <div>Nome</div>
        <div>E-mail</div>
        <div>Tipo</div>
        <div>Cadastro</div>
        <div className="text-right">Ações</div>
      </div>

      <div className="divide-y divide-line">
        {users.results.map((user) => (
          <div key={user.id} className="grid gap-3 px-5 py-4 transition hover:bg-primary-100/20 md:grid-cols-[minmax(220px,1.5fr)_minmax(240px,1.6fr)_120px_160px_120px] md:items-center md:gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50 md:hidden">Nome</div>
              <div className="text-sm font-medium text-ink">{user.name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50 md:hidden">E-mail</div>
              <div className="text-sm text-ink/80">{user.email}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50 md:hidden">Tipo</div>
              {canManageRoles && onRoleDraftChange && onUpdateUserRole ? (
                <div className="flex flex-col gap-2">
                  <select
                    aria-label={`Perfil de ${user.name}`}
                    value={roleDraftByUserId?.[user.id] || user.role}
                    disabled={user.id === currentUserId || updatingRoleUserId === user.id}
                    onChange={(event) => onRoleDraftChange(user.id, event.target.value as User['role'])}
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                  >
                    <option value="teacher">Professor</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onUpdateUserRole(user)}
                    disabled={
                      user.id === currentUserId
                      || updatingRoleUserId === user.id
                      || (roleDraftByUserId?.[user.id] || user.role) === user.role
                    }
                    className="inline-flex items-center justify-center rounded-xl border border-primary-200 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingRoleUserId === user.id ? 'Salvando...' : 'Salvar perfil'}
                  </button>
                </div>
              ) : (
                <span className="inline-flex rounded-full border border-primary-200 bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-600">
                  {roleLabelMap[user.role]}
                </span>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50 md:hidden">Cadastro</div>
              <div className="text-sm text-ink/80">
                {user.createdAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(user.createdAt)) : 'Nao informado'}
              </div>
            </div>
            <div className="flex justify-start md:justify-end">
              <button
                type="button"
                onClick={() => onRemoveUser(user)}
                disabled={
                  removingUserId === user.id
                  || !canDeleteUsers
                  || user.id === currentUserId
                }
                className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-danger transition hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removingUserId === user.id
                  ? 'Removendo...'
                  : user.id === currentUserId
                    ? 'Usuario atual'
                    : !canDeleteUsers
                      ? 'Sem permissao'
                      : 'Remover'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-5 py-4 text-sm text-ink/80 sm:flex-row sm:items-center sm:justify-between">
        <div>{users.total} usuário(s) listado(s).</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(currentPage - 1)}
            className="rounded-full border border-line px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {currentPage + 1} de {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            disabled={!hasNextPage}
            onClick={() => onPageChange(currentPage + 1)}
            className="rounded-full border border-line px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
};