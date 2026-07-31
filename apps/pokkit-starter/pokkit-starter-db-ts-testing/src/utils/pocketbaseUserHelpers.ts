const createRandomEmailAddress = () => `test${Math.floor(Math.random() * 10000000)}@example.com`;

function createRandomUserEmailPasswordData() {
  const email = createRandomEmailAddress();
  return { email, password: email };
}

const userPayloadBuilderInit = {
  forCreateData: (p: { email: string; password: string }) => ({
    email: p.email,
    password: p.password,
    passwordConfirm: p.password,
  }),
};

export const userPayloadBuilder = {
  ...userPayloadBuilderInit,
  forCreateRandomData: () =>
    userPayloadBuilderInit.forCreateData(createRandomUserEmailPasswordData()),
};
