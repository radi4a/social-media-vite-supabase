import { useState } from "react";
import { supabase } from "../supabase-client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
    userId: string;
    onComplete: () => void;
}

export const UsernameModal = ({ userId, onComplete }: Props) => {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const handleSave = async () => {
        if (!name.trim()) return;

        setLoading(true);
        setErrorMessage(null);

        try {
            const newProfile = {
                id: userId,
                full_name: name.trim(),
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                updated_at: new Date().toISOString()
            };

            await supabase.from("profiles").upsert(newProfile);

            // ⭐ Instant cache update (NO REFRESH)
            queryClient.setQueryData(["profile"], (old: any) => {
                if (!old) return newProfile;

                return {
                    ...old,
                    ...newProfile
                };
            });

            await queryClient.invalidateQueries({
                queryKey: ["profile"],
                refetchType: "active"
            });

            setLoading(false);
            onComplete();

        } catch (err) {
            console.error(err);
            setErrorMessage("Неуспешен запис.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="bg-gray-900 border border-purple-500/40 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center ring-1 ring-white/10">
                <div className="mb-6">
                    <span className="text-4xl">👋</span>
                    <h2 className="text-2xl font-bold text-white mt-4">Почти сме готови!</h2>
                    <p className="text-gray-400 text-sm mt-2">
                        Изберете име, с което ще се появявате в общността.
                    </p>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        maxLength={30}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Вашето име или никнейм"
                        className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white/10 transition-all placeholder-gray-500"
                    />

                    {errorMessage && (
                        <p className="text-red-400 text-xs bg-red-400/10 py-2 rounded-lg">
                            {errorMessage}
                        </p>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || loading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:from-purple-500 hover:to-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-purple-500/20"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Записване...
                            </span>
                        ) : (
                            "Запази и продължи"
                        )}
                    </button>
                </div>

                <p className="text-[10px] text-gray-500 mt-6 uppercase tracking-widest font-medium">
                    Можете да промените това по-късно от настройките
                </p>
            </div>
        </div>
    );
};