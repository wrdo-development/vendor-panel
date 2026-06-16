import { Container, Heading, Text } from "@medusajs/ui"

/**
 * TalkJS removed (WRDO-177). Vendor messages move to WRDO's conversation spine.
 * Placeholder until the WRDO widget slots in. (wrdo fork)
 */
export const Messages = () => {
  return (
    <Container className="divide-y p-0 min-h-[700px]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Messages</Heading>
        </div>
      </div>

      <div className="px-6 py-4 h-[655px] flex flex-col items-center w-full justify-center">
        <Heading>Coming soon</Heading>
        <Text className="text-ui-fg-subtle mt-4" size="small">
          Messages are moving to WRDO.
        </Text>
      </div>
    </Container>
  )
}
