import type { ListData, User } from '../types';

const roleLabelMap: Record<User['role'], string> = {
  admin: 'Admin',
  teacher: 'Professor',
};

interface UsersTableProps {
  users: ListData<User>;
  currentPage: number;
  totalPages: number;
  removingUserId?: string;
  onPageChange: (page: number) => void;
  onRemoveUser: (user: User) => Promise<void>;
}

export const UsersTable = ({
  users,
  currentPage,
  totalPages,
  removingUserId,
  onPageChange,
  onRemoveUser,
}: UsersTableProps) => {
  const hasPreviousPage = currentPage >= 1;
  const hasNextPage = currentPage + 1 < totalPages;

  return (
    <div className="panel overflow-hidden">
      <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(240px,1.6fr)_120px_160px_120px] gap-4 border-b border-line bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70 md:grid">
        <div>Nome</div>
        <div>E-mail</div>
        <div>Tipo</div>
        <div>Cadastro</div>
        <div className="text-right">Ações</div>
      </div>

      <div className="divide-y divide-line">
        {users.results.map((user) => (
          <div key={user.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(220px,1.5fr)_minmax(240px,1.6fr)_120px_160px_120px] md:items-center md:gap-4">
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
              <div className="text-sm text-ink/80">{roleLabelMap[user.role]}</div>
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
                disabled={removingUserId === user.id}
                className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removingUserId === user.id ? 'Removendo...' : 'Remover'}
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
            className="rounded-full border border-line px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="rounded-full border border-line px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
};