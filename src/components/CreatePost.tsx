import { useState, useEffect, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase-client";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router";
import { type Community, fetchCommunities } from "./CommunityList";

interface PostInput {
  title: string;
  content: string;
  userId: string;
  imageFiles: File[];
  community_id?: number | null;
}

const sanitizeFileName = (name: string) => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_");
};

const createPost = async (input: PostInput) => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", input.userId)
    .single();

  if (profileError) throw new Error("Профилът не е намерен.");

  let combinedUrls = "";
  if (input.imageFiles.length > 0) {
    const uploadedUrls = await Promise.all(
      input.imageFiles.map(async (file) => {
        const safeName = sanitizeFileName(file.name);
        const filePath = `${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase
          .storage
          .from("post-images")
          .upload(filePath, file);

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicURLData } = supabase
          .storage
          .from("post-images")
          .getPublicUrl(filePath);

        return publicURLData.publicUrl;
      })
    );

    combinedUrls = uploadedUrls.join(",");
  }

  const { data, error } = await supabase.from("posts").insert({
    title: input.title,
    content: input.content,
    user_id: input.userId,
    author_name: profile.full_name,
    avatar_url: profile.avatar_url,
    image_url: combinedUrls,
    community_id: input.community_id ?? null
  });

  if (error) throw new Error(error.message);
  return data;
};

export const CreatePost = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [communityId, setCommunityId] = useState<number | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: communities } = useQuery<Community[], Error>({
    queryKey: ["communities"],
    queryFn: () => fetchCommunities()
  });

  const { mutate, isPending, isError, error: mutationError } = useMutation({
    mutationFn: (input: PostInput) => createPost(input),
    onSuccess: () => navigate("/")
  });

  /* ⭐ AUTO SELECT COMMUNITY FROM URL */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const community = params.get("community");

    if (community) {
      const communityNumber = Number(community);

      if (!isNaN(communityNumber)) {
        setCommunityId(communityNumber);
      }
    }
  }, [location.search]);

  const handleCommunityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCommunityId(value ? Number(value) : null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      const newObjectUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newObjectUrls]);
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    mutate({
      title,
      content,
      userId: user.id,
      imageFiles: selectedFiles,
      community_id: communityId
    });
  };

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-10 text-center bg-gray-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl animate-reveal">
        <h2 className="text-3xl font-black text-white mb-4">
          Достъпът е забранен
        </h2>

        <p className="text-gray-400 text-lg mb-8">
          Трябва да си влязъл в профила си.
        </p>

        <button
          onClick={() => navigate("/")}
          className="px-10 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold"
        >
          Назад към началото
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto space-y-6 p-6 bg-black/50 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10"
    >
      <div>
        <label className="block mb-2 text-cyan-300 font-semibold tracking-wide">
          Заглавие
        </label>

        <input
          type="text"
          required
          value={title}
          placeholder="Напиши заглавие..."
          onChange={e => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 outline-none focus:ring-2 focus:ring-cyan-400 transition"
        />
      </div>

      <div>
        <label className="block mb-2 text-fuchsia-300 font-semibold tracking-wide">
          Описание
        </label>

        <textarea
          required
          rows={4}
          value={content}
          placeholder="Напиши описание..."
          onChange={e => setContent(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 outline-none focus:ring-2 focus:ring-fuchsia-500 resize-none transition"
        />
      </div>

      {/* Aurora dropdown */}
      <div className="w-full max-w-sm">
        <label className="block text-white/80 font-semibold mb-2">
          Избери общност
        </label>

        <div className="relative">
          <select
            value={communityId ?? ""}
            onChange={handleCommunityChange}
            className="w-full appearance-none bg-gray-900/80 text-white px-4 py-3 rounded-xl border border-white/20 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300"
          >
            <option value="">-- Избери общност --</option>

            {communities?.map(community => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block mb-2 text-purple-300 font-semibold tracking-wide text-sm">
          Добави снимки (незадължително)
        </label>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="image"
        />

        <label
          htmlFor="image"
          className="flex flex-col items-center justify-center w-full h-22 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-cyan-400 hover:bg-white/5 transition-all"
        >
          <span className="text-white/60">+ Кликни за избор на снимки</span>
          <span className="text-xs text-white/40 mt-1">Можеш да избереш няколко</span>
        </label>
      </div>

      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {previews.map((url, index) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-white/20 shadow-md">
              <img src={url} className="w-full h-full object-cover transition-transform hover:scale-110" />

              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold tracking-wide hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg disabled:opacity-30"
      >
        {isPending ? "Обработка..." : "Създай пост"}
      </button>

      {isError && (
        <p className="text-red-400 text-center">
          {mutationError instanceof Error
            ? mutationError.message
            : "Грешка при създаване на пост!"}
        </p>
      )}
    </form>
  );
};