import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase-client";

export const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    // Нова логика за известия
    const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
    const showToast = (msg: string, type: 'error' | 'success' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Auth състояния
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { signInWithGoogle, signOut, user } = useAuth();

    const [localName, setLocalName] = useState("");
    const [localBio, setLocalBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);

    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getStrength = (pass: string) => {
        let strength = 0;
        if (pass.length >= 6) strength++;
        if (pass.length >= 10) strength++;
        if (/[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^A-Za-z0-9]/.test(pass)) strength++;
        return strength;
    };

    const strength = getStrength(password);

    const openAuth = (mode: 'signin' | 'signup') => {
        setIsSignUp(mode === 'signup');
        setAuthModalOpen(true);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSignUp && password !== confirmPassword) {
            showToast("Паролите не съвпадат!", 'error');
            return;
        }

        setAuthLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName }
                    }
                });
                if (error) throw error;
                showToast("Успешна регистрация!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
            setAuthModalOpen(false);
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setFullName("");
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setUserRole(null);
                setLocalName("");
                setAvatarUrl("");
                setPreviewUrl("");
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, bio, avatar_url, role')
                .eq('id', user.id)
                .single();

            if (data && !error) {
                setLocalName(data.full_name || "");
                setLocalBio(data.bio || "");
                setAvatarUrl(data.avatar_url || "");
                setPreviewUrl(data.avatar_url || "");
                setUserRole(data.role || "user");
            } else {
                setLocalName(user.user_metadata?.full_name ?? "");
                setAvatarUrl(user.user_metadata?.avatar_url ?? "");
                setPreviewUrl(user.user_metadata?.avatar_url ?? "");
                setUserRole("user");
            }
        };

        fetchProfile();
    }, [user]);

    const handleSignOut = async () => {
        await signOut();
        setUserRole(null);
    };

    const displayName = localName || user?.email || "User";

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setUploading(true);

        try {
            let finalAvatarUrl = avatarUrl;
            const file = fileInputRef.current?.files?.[0];

            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalAvatarUrl = data.publicUrl;
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: localName,
                    avatar_url: finalAvatarUrl,
                    bio: localBio,
                    updated_at: new Date().toISOString(),
                });

            if (profileError) throw profileError;

            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    full_name: localName,
                    avatar_url: finalAvatarUrl,
                    bio: localBio
                }
            });

            if (updateError) throw updateError;

            setAvatarUrl(finalAvatarUrl);
            setProfileModalOpen(false);
            showToast("Профилът е обновен!");

        } catch (error: any) {
            showToast("Грешка: " + error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <nav className="fixed top-0 w-full z-40 bg-[rgba(10,10,10,0.8)] backdrop-blur-lg border-b border-white/10 shadow-lg">
            {/* КЪСТЪМ ИЗВЕСТИЕ (TOAST) - ИЗПОЛЗВАМЕ PORTAL ЗА ДА ИЗЛЕЗЕ НАПРЕД */}
            {toast && createPortal(
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300">
                    <div className={`px-4 py-2 rounded-full border shadow-2xl backdrop-blur-md flex items-center gap-2 ${toast.type === 'error'
                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                            : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        }`}>
                        <span className="text-xs">{toast.type === 'error' ? '✕' : '✓'}</span>
                        <span className="text-sm font-bold tracking-wide">{toast.msg}</span>
                    </div>
                </div>,
                document.body
            )}

            <div className="max-w-5xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="font-mono text-xl font-bold text-white">
                        Let's<span className="animate-aurora-text font-bold">.Help</span>
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link to="/" className="text-gray-300 hover:text-white transition-colors font-bold">Начало</Link>
                        <Link to="/create" className="text-gray-300 hover:text-white transition-colors font-bold">Създай пост</Link>
                        <Link to="/communities" className="text-gray-300 hover:text-white transition-colors font-bold">Общности</Link>
                        <Link to="/community/create" className="text-gray-300 hover:text-white transition-colors font-bold">Създай общност</Link>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        {userRole === 'admin' && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                </span>
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Admin</span>
                            </div>
                        )}

                        {user ? (
                            <div className="flex items-center space-x-4">
                                <div
                                    className="flex items-center space-x-3 cursor-pointer group"
                                    onClick={() => setProfileModalOpen(true)}
                                >
                                    <img
                                        src={avatarUrl || "/default-avatar.png"}
                                        alt="☻"
                                        className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover:border-blue-500/50 transition-all"
                                    />
                                    <span
                                        className="text-gray-300 group-hover:text-white transition-all min-w-0 flex-shrink"
                                        style={{ fontSize: 'clamp(0.875rem, 1.1vw, 1rem)' }}
                                    >
                                        {displayName}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="bg-red-500/10 text-red-500 border border-red-500/50 px-3 py-1 rounded-lg text-sm hover:bg-red-500 hover:text-white transition-all"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button onClick={() => openAuth('signin')} className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/50 px-3 py-1 rounded-lg text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all">Sign In</button>
                                <button onClick={() => openAuth('signup')} className="bg-blue-500/10 text-blue-500 border border-blue-500/50 px-3 py-1 rounded-lg text-sm font-bold hover:bg-blue-500 hover:text-white transition-all">Sign Up</button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        {userRole === 'admin' && (
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500 shadow-[0_0_8px_#a855f7]"></span>
                            </span>
                        )}
                        <button
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="text-gray-300 focus:outline-none"
                            aria-label="Toggle menu"
                        >
                            <div className="relative w-6 h-4 flex items-center justify-center">
                                <span className={`absolute h-0.5 w-6 bg-current rounded-full transition-all duration-300 ease-in-out ${menuOpen ? "rotate-45 translate-y-0" : "-translate-y-2"}`} />
                                <span className={`absolute h-0.5 w-6 bg-current rounded-full transition-all duration-300 ease-in-out ${menuOpen ? "opacity-0 -translate-x-2" : "opacity-100"}`} />
                                <span className={`absolute h-0.5 w-6 bg-current rounded-full transition-all duration-300 ease-in-out ${menuOpen ? "-rotate-45 translate-y-0" : "translate-y-2"}`} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)}>
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                    </div>

                    <div className="md:hidden bg-[rgba(10,10,10,0.95)] fixed top-16 left-0 w-full z-50 border-b border-gray-800">
                        <div className="px-2 pt-2 pb-3 space-y-1 shadow-2xl">
                            <div className="flex items-center space-x-3 px-3 py-3 border-b border-gray-800">
                                {user ? (
                                    <>
                                        <div
                                            className="flex items-center space-x-3 cursor-pointer"
                                            onClick={() => { setProfileModalOpen(true); setMenuOpen(false); }}
                                        >
                                            <img
                                                src={avatarUrl || "/default-avatar.png"}
                                                alt="User Avatar"
                                                className="w-9 h-9 rounded-full object-cover border border-gray-700"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-gray-200 font-medium">{displayName}</span>
                                                {userRole === 'admin' && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] text-purple-400 font-bold uppercase tracking-tighter">Administrator</span>
                                                        <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { handleSignOut(); setMenuOpen(false); }}
                                            className="ml-auto bg-red-500/10 text-red-500 border border-red-500/50 px-3 py-1 rounded-lg text-sm hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            Sign Out
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex gap-2 w-full">
                                        <button onClick={() => { openAuth('signin'); setMenuOpen(false); }} className="flex-1 py-2 rounded-lg font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/50 hover:bg-emerald-500 hover:text-white transition-all">Sign In</button>
                                        <button onClick={() => { openAuth('signup'); setMenuOpen(false); }} className="flex-1 py-2 rounded-lg font-bold bg-blue-500/10 text-blue-500 border border-blue-500/50 hover:bg-blue-500 hover:text-white transition-all">Sign Up</button>
                                    </div>
                                )}
                            </div>
                            {[
                                { to: "/", label: "Начало" },
                                { to: "/create", label: "Създай пост" },
                                { to: "/communities", label: "Общности" },
                                { to: "/community/create", label: "Създай общност" }
                            ].map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setMenuOpen(false)}
                                    className="block px-4 py-3 rounded-md text-base font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* AUTH MODAL */}
            {authModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setAuthModalOpen(false)} />
                    <div className="relative bg-[#0f1115] border border-white/10 rounded-2xl w-full max-w-sm p-8 shadow-2xl">
                        <button onClick={() => setAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">✕</button>

                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-white text-2xl font-bold">{isSignUp ? "Създай профил" : "Влез в профила"}</h2>
                            <p className="text-gray-500 text-sm">Добре дошли в Let's.Help</p>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-4">
                            <input
                                type="email"
                                placeholder="Имейл адрес"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-blue-500 transition-all text-sm"
                            />

                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Парола"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-3 pr-10 rounded-lg text-white outline-none focus:border-blue-500 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>

                            {isSignUp && password.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex gap-1 h-1">
                                        {[1, 2, 3, 4, 5].map((step) => (
                                            <div
                                                key={step}
                                                className={`h-full flex-1 rounded-full transition-all duration-500 ${step <= strength
                                                    ? strength <= 2 ? 'bg-red-500/80'
                                                        : strength <= 4 ? 'bg-yellow-500/80'
                                                            : 'bg-emerald-500/80'
                                                    : 'bg-white/5'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${strength <= 2 ? 'text-red-500/80' : strength <= 4 ? 'text-yellow-500/80' : 'text-emerald-500/80'}`}>
                                            {strength <= 2 ? 'Слаба' : strength <= 4 ? 'Средна' : 'Силна парола'}
                                        </p>
                                        <span className="text-[9px] text-gray-600 font-medium">Сигурност</span>
                                    </div>
                                </div>
                            )}

                            {isSignUp && (
                                <div className="mt-4 relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Потвърди парола"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full bg-white/5 border p-3 pr-10 rounded-lg text-white outline-none transition-all text-sm ${confirmPassword.length > 0 && password !== confirmPassword
                                            ? 'border-red-500/50 focus:border-red-500'
                                            : 'border-white/10 focus:border-blue-500'
                                            }`}
                                    />
                                    {confirmPassword.length > 0 && password !== confirmPassword && (
                                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-1 px-1">
                                            Паролите не съвпадат
                                        </p>
                                    )}
                                </div>
                            )}

                            <button
                                disabled={authLoading}
                                type="submit"
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                            >
                                {authLoading ? "Зареждане..." : (isSignUp ? "Регистрирай ме" : "Влез")}
                            </button>
                        </form>

                        <div className="relative flex items-center py-6">
                            <div className="flex-grow border-t border-white/5"></div>
                            <span className="flex-shrink mx-4 text-gray-600 text-[10px] uppercase font-black tracking-widest">или</span>
                            <div className="flex-grow border-t border-white/5"></div>
                        </div>

                        <button
                            onClick={signInWithGoogle}
                            className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all shadow-lg"
                        >
                            <svg width="20" height="20" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                            </svg>
                            Влез с Google
                        </button>

                        <div className="text-center mt-6">
                            <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-gray-400 hover:text-white transition-colors">
                                {isSignUp ? "Вече имаш профил? Влез" : "Нямаш профил? Регистрирай се"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* PROFILE SETTINGS MODAL */}
            {profileModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !uploading && setProfileModalOpen(false)} />

                    <div className="relative bg-[#0f1115] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <h2 className="text-white text-xl font-bold text-center">Настройки на профила</h2>

                            <div className="flex flex-col items-center">
                                <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                                    <img
                                        src={previewUrl || "/default-avatar.png"}
                                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-900 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-500 ease-out group-hover:scale-105 group-hover:border-purple-500 group-hover:shadow-[0_0_50px_rgba(168,85,247,0.8)] ring-4 ring-transparent group-hover:ring-purple-500/20"
                                        alt="Preview"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white uppercase p-2">Промяна</div>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Име</label>
                                    <input
                                        value={localName}
                                        onChange={(e) => setLocalName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg focus:border-blue-500 outline-none text-white text-sm transition-colors"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase px-1">Био</label>
                                    <textarea
                                        value={localBio}
                                        onChange={(e) => setLocalBio(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg focus:border-blue-500 outline-none text-white text-sm resize-none h-24"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setProfileModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors">Отказ</button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex-1 py-2.5 bg-blue-500/10 text-blue-500 border border-blue-500/50 rounded-lg text-sm font-bold hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {uploading ? "Запис..." : "Запази"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </nav>
    );
};