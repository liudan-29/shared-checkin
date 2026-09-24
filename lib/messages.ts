import { getSupabase } from "./supabase";
import type { Message } from "./types";

const RECENT_LIMIT = 20;

// 只取最近N条，小组内三位成员都能读
export async function fetchRecentMessages(groupId: string, limit: number = RECENT_LIMIT): Promise<Message[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Message[]) ?? [];
}

export async function postMessage(groupId: string, senderId: string, content: string): Promise<Message> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .insert({ group_id: groupId, sender_id: senderId, content })
    .select("*")
    .single();
  if (error) throw error;
  return data as Message;
}

export async function deleteMessage(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) throw error;
}

// 订阅新留言的实时插入事件，回调只在收到确实是"新"的一条时触发
export function subscribeNewMessages(
  groupId: string,
  onInsert: (message: Message) => void
): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel("messages_feed")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
