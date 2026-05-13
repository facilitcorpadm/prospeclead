import { createContext, useContext, ReactNode } from "react";

const ReadOnlyContext = createContext<boolean>(false);

/**
 * Provider que sinaliza para todas as páginas filhas que estão em modo
 * "somente leitura" (Visualizador). As páginas existentes leem esse flag
 * via `useReadOnly()` para esconder/desabilitar botões de ação.
 */
export function ReadOnlyProvider({
  value = true,
  children,
}: {
  value?: boolean;
  children: ReactNode;
}) {
  return (
    <ReadOnlyContext.Provider value={value}>{children}</ReadOnlyContext.Provider>
  );
}

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}
