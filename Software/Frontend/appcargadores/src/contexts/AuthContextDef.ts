import { createContext } from 'react';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  vehicles: string[];
  ownedStations: string[];
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
