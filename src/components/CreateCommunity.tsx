import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "../supabase-client";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";



interface CommunityInput {
    name: string;
    description: string;
}

const createCommunity = async (
  community: CommunityInput & { user_id: string }
) => {
  const { error, data } = await supabase
    .from("communities")
    .insert(community);

  if (error) throw new Error(error.message);
  return data;
};

export const CreateCommunity = () => {
    const [name, setName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const navigate = useNavigate()
    const queryClient = useQueryClient();

    const { user } = useAuth();

    const { mutate, isPending, isError } = useMutation({
        mutationFn: createCommunity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["communities"] });
            navigate("/communities")
        },
    });

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!user) return;

  mutate({
    name,
    description,
    user_id: user.id, 
  });
};

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-10 text-center bg-gray-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl animate-reveal">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 mb-6 border border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
                    <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Достъпът е забранен</h2>
                <p className="text-gray-400 text-lg mb-8 max-w-sm mx-auto">
                    Трябва да си влязъл в профила си, за да можеш да публикуваш съдържание.
                </p>
                <button
                    onClick={() => navigate("/")}
                    className="px-10 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all"
                >
                    Назад към началото
                </button>
            </div>
        );
    }

    return (
        <form 
        onSubmit={handleSubmit} 
        className="max-w-2xl mx-auto space-y-6 p-6 bg-black/50 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10">
            

            <div>
                <label className="block mb-2 text-cyan-300 font-semibold tracking-wide"
                >Име на общността</label>
                <input type="text" id="name" required onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 outline-none focus:ring-2 focus:ring-cyan-400 transition"
                 />
            </div>

            <div>
                <label className="block mb-2 text-fuchsia-300 font-semibold tracking-wide">Oписание на общността</label>
                <textarea 
                id="description" 
                required rows={3} 
                onChange={(e) => setDescription(e.target.value)} 
                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 outline-none focus:ring-2 focus:ring-fuchsia-500 resize-none transition"/>
            </div>

            <button
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold tracking-wide hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
            >{isPending ? "Създаване..." : "Създай общност"}</button>
            {isError && <p>Грешка при създаване на общност.</p>}
        </form>
    )
}