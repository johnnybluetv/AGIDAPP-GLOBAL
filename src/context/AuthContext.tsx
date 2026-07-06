import * as React from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider,
  signOut, 
  User,
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult
} from "firebase/auth";
import { auth } from "../firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  login: () => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  loginWithEmail: (email: string, password: string, isSignUp: boolean, displayName?: string) => Promise<UserCredential>;
  loginWithPhone: (phoneNumber: string, recaptchaVerifier: any) => Promise<ConfirmationResult>;
  loginWithOAuthProvider: (providerId: "apple.com" | "facebook.com" | "amazon.com") => Promise<UserCredential>;
  logout: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [accessToken, setAccessToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        setAccessToken(null);
      }
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive");
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setAccessToken(credential.accessToken);
    }
    return result;
  };

  // Maintain login as an alias for backward compatibility
  const login = loginWithGoogle;

  const loginWithEmail = async (email: string, password: string, isSignUp: boolean, displayName?: string) => {
    let result: UserCredential;
    if (isSignUp) {
      result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }
    } else {
      result = await signInWithEmailAndPassword(auth, email, password);
    }
    return result;
  };

  const loginWithPhone = async (phoneNumber: string, recaptchaVerifier: any) => {
    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  };

  const loginWithOAuthProvider = async (providerId: "apple.com" | "facebook.com" | "amazon.com") => {
    let provider;
    if (providerId === "facebook.com") {
      provider = new FacebookAuthProvider();
    } else {
      provider = new OAuthProvider(providerId);
    }
    return await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      accessToken, 
      login, 
      loginWithGoogle, 
      loginWithEmail, 
      loginWithPhone, 
      loginWithOAuthProvider, 
      logout, 
      setAccessToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
