export const Button = (p: { children: React.ReactNode }) => {
  return (
    <button className="px-6 py-2.5 text-sm font-medium rounded-lg active:scale-95 transition-all duration-150 cursor-pointer bg-zinc-900 text-white hover:bg-zinc-700">
      {p.children}
    </button>
  );
};
