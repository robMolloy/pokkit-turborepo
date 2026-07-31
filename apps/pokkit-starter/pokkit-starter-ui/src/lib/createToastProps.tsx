export  const createToastProps = (messages: string[]) => {
  const [firstMessage, ...otherMessages] = messages;
  return [
    firstMessage,
    { description: otherMessages?.map((msg, index) => <p key={index}>{msg}</p>) },
  ] as const;
};