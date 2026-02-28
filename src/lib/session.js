const SESSION_KEY = 'queue_session_id';

export function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `s${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
