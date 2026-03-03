import { PostDetail } from "../components/PostDetail";
import { useParams } from "react-router";

export const PostPage = () => {
    const { id } = useParams<{ id: string }>();
    return (
        <div className="pt-10">
            <PostDetail postId={Number(id)} />
        </div>
    )
}