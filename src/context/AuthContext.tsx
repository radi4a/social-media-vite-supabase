import type { User } from '@supabase/supabase-js'
import { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '../supabase-client'
// Внеси модала тук (ако го направиш в отделен файл)
import { UsernameModal } from '../components/UsernameModal' 

interface AuthContextType {
    user: User | null
    signInWithGoogle: () => void
    signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [needsProfile, setNeedsProfile] = useState(false) // Нов стейт за поп-ъпа

    useEffect(() => {
        // Зареждане на сесията
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) checkProfile(session.user.id);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                checkProfile(session.user.id);
            } else {
                setNeedsProfile(false); // Изчистваме при излизане
            }
        })

        return () => {
            listener?.subscription.unsubscribe()
        }
    }, []);

    // Функция за проверка на профила
    const checkProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle(); // maybeSingle не хвърля грешка ако няма запис

        if (!data || !data.full_name) {
            setNeedsProfile(true);
        }
        if (error) return <div className="text-red-500 text-center p-4">Грешка: {error.message}</div>;
    };

    const signInWithGoogle = () => {
        supabase.auth.signInWithOAuth({ provider: 'google' })
    }

    const signOut = () => {
        supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{ user, signInWithGoogle, signOut }}>
            {children}

            {/* Поп-ъпът се показва глобално тук */}
            {needsProfile && user && (
                <UsernameModal 
                    userId={user.id} 
                    onComplete={() => setNeedsProfile(false)} 
                />
            )}
        </AuthContext.Provider>
    )
}

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context;
}