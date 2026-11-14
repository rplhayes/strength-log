/** Shares the "new version available" state with any screen that shows it. */
import { createContext, useContext, type ReactNode } from 'react';
import { useAppUpdate } from './useAppUpdate';

interface UpdateState {
  needRefresh: boolean;
  update: () => void;
}

const UpdateContext = createContext<UpdateState>({ needRefresh: false, update: () => {} });

export function UpdateProvider({ children }: { children: ReactNode }) {
  const { needRefresh, update } = useAppUpdate();
  return <UpdateContext.Provider value={{ needRefresh, update: () => void update() }}>{children}</UpdateContext.Provider>;
}

export const useUpdateState = () => useContext(UpdateContext);
