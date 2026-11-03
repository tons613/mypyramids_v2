import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: number;
  uid: string;
  email: string;
  phone: string;
  role: string;
  firstname?: string;
  lastname?: string;
  status?: number;
  phone_verified?: boolean;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  state?: string | null;
  profession?: string | null;
  title?: string | null;
  institution?: string | null;
  institution_address?: string | null;
  doc_profile?: {
    profession?: string | null;
    title?: string | null;
    institution?: string | null;
    institution_address?: string | null;
  } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  profileLoaded: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  profileLoaded: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.profileLoaded = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.profileLoaded = false;
      state.loading = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;

export type AuthUser = User;

export function getAuthDestination(user: AuthUser | null) {
  if (!user?.phone_verified) return '/auth/verify' as const;

  const hasRequiredProfile = Boolean(
    user.firstname && user.lastname && user.gender && user.dob && user.address && user.state,
  );
  const hasProviderProfile = user.role !== 'provider' || Boolean(
    (user.profession || user.doc_profile?.profession) &&
    (user.title || user.doc_profile?.title) &&
    (user.institution || user.doc_profile?.institution) &&
    (user.institution_address || user.doc_profile?.institution_address),
  );
  return hasRequiredProfile && hasProviderProfile ? '/(tabs)' as const : '/auth/profile' as const;
}
