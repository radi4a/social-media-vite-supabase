import { CreatePost } from "../components/CreatePost";

export const CreatePostPage = () => {
    return (
        <div className="pt-10 md:pt-20 px-4">
            <h2 className="text-3xl md:text-6xl font-black mb-6 text-center 
    bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 
    bg-clip-text text-transparent 
    drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] md:drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]"
            >
                Създай нова публикация
            </h2>
            <CreatePost />
        </div>
    );
};