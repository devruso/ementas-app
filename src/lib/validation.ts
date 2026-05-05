export const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isUfbaInstitutionalEmail = (value: string) => {
  const normalized = normalizeEmail(value);

  return /@([a-z0-9-]+\.)*ufba\.br$/i.test(normalized);
};

export const isValidPassword = (value: string) =>
  /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*.!@$%&:;<>?_\-=+])[0-9a-zA-Z*.!@$%&:;<>?_\-=+]{8,20}$/.test(
    value
  );