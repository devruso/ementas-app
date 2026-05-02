export const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export const isValidPassword = (value: string) =>
  /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*.!@$%&:;<>?_\-=+])[0-9a-zA-Z*.!@$%&:;<>?_\-=+]{8,20}$/.test(
    value
  );