import { getSupabase } from "./supabase";
import type { CheckinGroup, GroupContext, GroupMember, Profile } from "./types";

export async function fetchMyGroupContext(userId: string): Promise<GroupContext | null> {
  const supabase = getSupabase();
  const { data: membershipData, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id,user_id,role,joined_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membershipData) return null;

  const membership = membershipData as GroupMember;
  const [{ data: groupData, error: groupError }, { data: memberRows, error: membersError }] =
    await Promise.all([
      supabase.from("checkin_groups").select("id,name,owner_id,created_at").eq("id", membership.group_id).single(),
      supabase
        .from("group_members")
        .select("user_id,joined_at")
        .eq("group_id", membership.group_id)
        .order("joined_at", { ascending: true }),
    ]);
  if (groupError) throw groupError;
  if (membersError) throw membersError;

  const memberIds = (memberRows ?? []).map((row) => row.user_id as string);
  const { data: profilesData, error: profilesError } = await supabase
    .from("users")
    .select("id,name,avatar_url")
    .in("id", memberIds);
  if (profilesError) throw profilesError;

  const profilesById = new Map(
    ((profilesData as Profile[] | null) ?? []).map((profile) => [profile.id, profile])
  );
  const members = memberIds
    .map((id) => profilesById.get(id))
    .filter((profile): profile is Profile => Boolean(profile));

  return {
    group: groupData as CheckinGroup,
    membership,
    members,
  };
}
