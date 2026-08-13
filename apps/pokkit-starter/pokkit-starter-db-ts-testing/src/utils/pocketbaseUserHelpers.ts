export type TUserPayloadCreateData = {
  email: string;
  password: string;
  passwordConfirm: string;
};

const createRandomEmailAddress = () => `test${Math.floor(Math.random() * 10000000)}@example.com`;

function createRandomUserEmailPasswordData(): TUserPayloadCreateData {
  const email = createRandomEmailAddress();
  return { email, password: email, passwordConfirm: email };
}

const userPayloadBuilderInit = {
  forCreateData: <T extends TUserPayloadCreateData>(p: T) =>
    ({
      email: p.email,
      password: p.password,
      passwordConfirm: p.passwordConfirm,
    }) as T,
};

export const userPayloadBuilder = {
  ...userPayloadBuilderInit,
  forCreateRandomData: () =>
    userPayloadBuilderInit.forCreateData(createRandomUserEmailPasswordData()),
};
