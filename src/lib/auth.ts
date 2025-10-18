// Mock auth configuration - in production, use NextAuth.js
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: 'google' | 'github';
}

export interface Session {
  user: User;
  expires: string;
}

// Mock session storage
let currentSession: Session | null = null;

export const mockUsers = {
  google: {
    id: '1',
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    image: 'https://i.pravatar.cc/150?img=12',
    provider: 'google' as const,
  },
  github: {
    id: '2',
    name: 'Jordan Smith',
    email: 'jordan.smith@example.com',
    image: 'https://i.pravatar.cc/150?img=33',
    provider: 'github' as const,
  },
};

export const signIn = async (provider: 'google' | 'github'): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = mockUsers[provider];
      currentSession = {
        user,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem('session', JSON.stringify(currentSession));
      resolve();
    }, 800);
  });
};

export const signOut = async (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      currentSession = null;
      localStorage.removeItem('session');
      resolve();
    }, 300);
  });
};

export const getSession = (): Session | null => {
  if (currentSession) return currentSession;
  
  const stored = localStorage.getItem('session');
  if (stored) {
    try {
      currentSession = JSON.parse(stored);
      return currentSession;
    } catch {
      return null;
    }
  }
  
  return null;
};

export const useAuth = () => {
  const session = getSession();
  return {
    user: session?.user ?? null,
    isAuthenticated: !!session,
  };
};
