export const formatDate = (value?: string) => {
  if (!value) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

export const formatWorkload = (value?: number) => `${value ?? 0}h`;