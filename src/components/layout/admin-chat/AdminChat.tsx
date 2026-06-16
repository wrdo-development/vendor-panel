import { ChatBubble } from "@medusajs/icons"
import { Drawer, Heading, IconButton, Text } from "@medusajs/ui"
import { useState } from "react"

/**
 * TalkJS removed (WRDO-177). Admin↔vendor chat moves to WRDO's conversation
 * spine. Drawer + trigger kept; body is a placeholder until the WRDO widget
 * slots in. (wrdo fork)
 */
export const AdminChat = () => {
  const [open, setOpen] = useState(false)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <IconButton
          variant="transparent"
          className="text-ui-fg-muted hover:text-ui-fg-subtle"
        >
          <ChatBubble />
        </IconButton>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>Chat with admin</Heading>
          </Drawer.Title>
        </Drawer.Header>
        <div className="flex flex-col items-center justify-center h-full px-6">
          <Text className="text-ui-fg-subtle" size="small">
            Chat is moving to WRDO — coming soon.
          </Text>
        </div>
      </Drawer.Content>
    </Drawer>
  )
}
