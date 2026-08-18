import { supabase } from './supabaseClient';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';

/**
 * Fetch all conversation partners for a user, with last message + unread count.
 * Returns: [{ partnerId, lastMessage, unreadCount }]
 */
export async function fetchConversations(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Group by the other participant
  const convMap = new Map();
  for (const msg of data) {
    const partnerId =
      msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, {
        partnerId,
        lastMessage: msg,
        unreadCount:
          msg.recipient_id === userId && !msg.read ? 1 : 0,
      });
    } else {
      if (msg.recipient_id === userId && !msg.read) {
        convMap.get(partnerId).unreadCount++;
      }
    }
  }

  return Array.from(convMap.values());
}

/**
 * Fetch all messages between two users, oldest first.
 */
export async function fetchMessages(userId, partnerId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),` +
      `and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`
    )
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Insert a new message into the messages table.
 */
export async function sendMessage(senderId, recipientId, content, type = 'text') {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, content, type })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark all unread messages from a partner as read.
 */
export async function markMessagesRead(userId, partnerId) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('sender_id', partnerId)
    .eq('read', false);

  if (error) console.error('[messageService] markMessagesRead:', error);
}

/**
 * Look up a profile by username (with or without @).
 * Returns { id, username, avatar_url } or null.
 */
export async function findUserByUsername(username) {
  const clean = username.startsWith('@') ? username.slice(1) : username;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', clean)
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

/**
 * Fetch a profile by UUID.
 */
export async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', userId)
    .single();
  return data;
}

/**
 * Subscribe to new incoming messages for userId via Supabase Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToIncomingMessages(userId, onMessage) {
  const channel = supabase
    .channel(`inbox:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Delete all messages between two users (clears chat history while keeping the contact).
 */
export async function clearChatMessages(userId, partnerId) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),` +
      `and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`
    );

  if (error) {
    console.error('[messageService] clearChatMessages error:', error);
    throw error;
  }
  return true;
}

export { DEFAULT_AVATAR };
