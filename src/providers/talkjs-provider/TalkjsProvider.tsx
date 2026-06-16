/**
 * TalkJS removed (WRDO-177): chat moves to WRDO's single-thread conversation
 * spine, not a 3rd-party SaaS. Pass-through so protected-route keeps its shape;
 * the WRDO widget slots in here when the spine ships. (wrdo fork)
 */
export const TalkjsProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}
